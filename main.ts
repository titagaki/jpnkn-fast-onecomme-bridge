// jpnkn Fast (MQTT/WS) → OneComme (HTTP API) ブリッジ - Electron メインプロセス

import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, type IpcMainInvokeEvent } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import mqtt, { type MqttClient } from 'mqtt';
import store, { type StoreSchema } from './config.js';
import { transformJpnknToOneComme, parsePayload } from './src/transform.js';
import type { JpnknPayload } from './src/transform.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let client: MqttClient | null = null;
let isQuitting = false;

interface StatusPayload {
  connected: boolean;
}

interface MessagePayload {
  topic: string;
  text: string;
}

// --- 単一インスタンス確保 ---
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      if (!win.isVisible()) win.show();
      win.focus();
    }
  });
}

// --- Window / Tray ---
function createWindow(): void {
  win = new BrowserWindow({
    width: 860,
    height: 640,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));

  win.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      win?.hide();
    }
  });
}

function createTray(): void {
  const iconPath = path.join(__dirname, '..', 'src', 'icon.ico');
  let icon: Electron.NativeImage;
  try {
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) throw new Error('Icon is empty');
  } catch {
    icon = nativeImage.createFromBuffer(
      Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAH0lEQVQ4T2NkYGD4z0ABYBw1YDQMqCMM/tMqDEbDAACCtwQRwQILywAAAABJRU5ErkJggg==', 'base64')
    );
  }
  tray = new Tray(icon);
  const menu = Menu.buildFromTemplate([
    { label: 'Open', click: () => { win?.show(); win?.focus(); } },
    { type: 'separator' },
    { label: 'Start', click: () => startBridge() },
    { label: 'Stop', click: () => stopBridge() },
    { type: 'separator' },
    { label: 'Quit', role: 'quit' }
  ]);
  tray.setToolTip('jpnkn Fast → OneComme Bridge');
  tray.setContextMenu(menu);
  tray.on('double-click', () => { win?.show(); });
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  // 初回起動時は常にウィンドウを表示
  win?.show();

  const openAtLogin = !!store.get('autoStart');
  app.setLoginItemSettings({ openAtLogin, openAsHidden: true });
  if (openAtLogin) startBridge();
});

app.on('window-all-closed', () => {
  // Do nothing - keep app running in tray
});

// --- Renderer 通知 ---
function sendToRenderer(channel: string, payload: unknown): void {
  if (win && win.webContents) {
    win.webContents.send(channel, payload);
  }
}

async function postToOneComme(jpnknData: JpnknPayload): Promise<void> {
  const base = (store.get('onecommeBase') || 'http://127.0.0.1:11180').replace(/\/$/, '');
  const serviceId = store.get('serviceId');

  if (!serviceId) {
    sendToRenderer('log', 'Service ID が未設定のため送信をスキップしました');
    return;
  }

  const payload = transformJpnknToOneComme(jpnknData, { serviceId });
  
  await axios.post(`${base}/api/comments`, payload, { timeout: 10000 });
}

// --- Bridge 本体 ---
function startBridge(): void {
  stopBridge();

  const serviceId = store.get('serviceId');
  if (!serviceId) {
    sendToRenderer('log', 'Error: わんコメ枠IDが未設定です。設定を保存してからStartしてください。');
    return;
  }

  const url = 'mqtt://bbs.jpnkn.com:1883';
  const username = 'genkai';
  const password = '7144';

  const topicsInput = store.get('topics') || 'mamiko';
  const trimmed = topicsInput.trim();
  const topic = trimmed.startsWith('bbs/') ? trimmed : `bbs/${trimmed}`;

  sendToRenderer('log', `Connecting ${url} ...`);

  client = mqtt.connect(url, {
    username,
    password,
    keepalive: 60,
    reconnectPeriod: 3000
  });

  client.on('connect', () => {
    sendToRenderer('status', '● Connected');
    client!.subscribe(topic, { qos: 0 }, (err) =>
      sendToRenderer('log', err ? `Subscribe failed: ${topic}` : `Subscribed: ${topic}`)
    );
  });

  client.on('reconnect', () => sendToRenderer('log', 'Reconnecting...'));
  client.on('error', (e: Error) => sendToRenderer('log', `Error: ${e.message}`));
  client.on('close', () => sendToRenderer('status', '● Disconnected'));

  client.on('message', async (topic: string, payload: Buffer) => {
    try {
      const raw = payload.toString('utf8').trim();
      if (!raw) return;

      const parsed: JpnknPayload = JSON.parse(raw) as JpnknPayload;

      const text = parsePayload(raw);
      sendToRenderer('message', { topic, text } as MessagePayload);

      try {
        await postToOneComme(parsed);
      } catch (e) {
        sendToRenderer('log', `POST fail: ${(e as Error).message}`);
      }
    } catch (err) {
      sendToRenderer('log', `Handle message error: ${(err as Error)?.message || err}`);
    }
  });
}

function stopBridge(): void {
  if (client) {
    try { client.end(true); } catch { }
    client = null;
    sendToRenderer('status', '● Disconnected');
    sendToRenderer('log', 'Bridge stopped');
  }
}

// --- IPC ---
ipcMain.handle('get-config', () => {
  return {
    topics: store.get('topics'),
    onecommeBase: store.get('onecommeBase'),
    serviceId: store.get('serviceId'),
    autoStart: store.get('autoStart')
  };
});

ipcMain.handle('set-config', (_e: IpcMainInvokeEvent, kv: Partial<StoreSchema>) => {
  Object.entries(kv || {}).forEach(([k, v]) => {
    if (v !== undefined) store.set(k as keyof StoreSchema, v as never);
  });
  const openAtLogin = !!store.get('autoStart');
  app.setLoginItemSettings({ openAtLogin, openAsHidden: true });
  return {
    topics: store.get('topics'),
    onecommeBase: store.get('onecommeBase'),
    serviceId: store.get('serviceId'),
    autoStart: store.get('autoStart')
  };
});

ipcMain.handle('start', async () => { startBridge(); return true; });
ipcMain.handle('stop', async () => { stopBridge(); return true; });

app.on('before-quit', () => {
  isQuitting = true;
  stopBridge();
});
