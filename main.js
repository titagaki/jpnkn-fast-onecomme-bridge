// jpnkn Fast (MQTT/WS) → OneComme (HTTP API) ブリッジ - Electron メインプロセス

import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import mqtt from 'mqtt';
import store from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

let win = null;
let tray = null;
let client = null; // MQTT client

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
function createWindow() {
  win = new BrowserWindow({
    width: 860,
    height: 640,
    show: false, // トレイ常駐アプリらしく非表示で開始
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
}

function createTray() {
  // アイコンは src/icon.ico（無ければ適当なPNGに差し替えてOK）
  const iconPath = path.join(__dirname, 'src', 'icon.ico');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);
  const menu = Menu.buildFromTemplate([
    { label: 'Open', click: () => { win.show(); win.focus(); } },
    { type: 'separator' },
    { label: 'Start', click: () => startBridge() },
    { label: 'Stop',  click: () => stopBridge() },
    { type: 'separator' },
    { label: 'Quit',  role: 'quit' }
  ]);
  tray.setToolTip('jpnkn Fast → OneComme Bridge');
  tray.setContextMenu(menu);
  tray.on('double-click', () => { win.show(); });
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  // ログイン時自動起動（設定に追従）
  const openAtLogin = !!store.get('autoStart');
  app.setLoginItemSettings({ openAtLogin, openAsHidden: true });
  if (openAtLogin) startBridge();
});

// ウィンドウ全閉じでも常駐させる
app.on('window-all-closed', (e) => {
  e.preventDefault();
});

// --- Renderer 通知 ---
function sendToRenderer(channel, payload) {
  if (win && win.webContents) {
    win.webContents.send(channel, payload);
  }
}

// --- ユーティリティ ---
function splitForTTS(text, n) {
  const parts = String(text || '')
    .replace(/\r/g, '')
    .split(/(?<=[。！？!?。\n])/)
    .map(s => s.trim())
    .filter(Boolean);
  const out = [];
  for (const p of parts) {
    for (let i = 0; i < p.length; i += n) out.push(p.slice(i, i + n));
  }
  return out.length ? out : [text]; // 空になった場合の保険
}

function parsePayload(raw) {
  // jpnkn Fast のメッセージが JSON なら本文を整形。素テキストならそのまま。
  try {
    const j = JSON.parse(raw);
    const no   = j.no   ? `No.${j.no} ` : '';
    const name = j.name ? `${j.name} > ` : '';
    const msg  = j.msg  ?? raw;
    return `${no}${name}${msg}`;
  } catch {
    return raw;
  }
}

async function postToOneComme(text) {
  const base = (store.get('onecommeBase') || 'http://127.0.0.1:11180').replace(/\/$/, '');
  const serviceId = store.get('serviceId');
  const name = store.get('authorName')   || 'jpnkn';
  const userId = store.get('authorUserId') || 'jpnkn:bridge';

  if (!serviceId) {
    sendToRenderer('log', 'Service ID が未設定のため送信をスキップしました');
    return;
  }

  const body = {
    service: { id: serviceId },
    comment: {
      id: `ext-${Date.now()}-${Math.floor(Math.random()*1e6)}`,
      userId,
      name,
      comment: text
    }
  };

  await axios.post(`${base}/api/comments`, body, { timeout: 10000 });
}

// --- Bridge 本体 ---
function startBridge() {
  stopBridge(); // 多重起動防止

  const url       = store.get('brokerUrl');
  const username  = store.get('username');
  const password  = store.get('password');
  const topics    = (store.get('topics') || 'bbs/#').split(',').map(s => s.trim()).filter(Boolean);
  const delayMs   = Number(store.get('delayMs') ?? 100);
  const chunkSize = Number(store.get('chunkSize') ?? 120);

  if (!url) {
    sendToRenderer('log', 'Broker URL が未設定です。設定画面から入力してください。');
    return;
  }

  sendToRenderer('log', `Connecting ${url} ...`);

  client = mqtt.connect(url, {
    username: username || undefined,
    password: password || undefined,
    keepalive: 60,
    reconnectPeriod: 3000
  });

  client.on('connect', () => {
    sendToRenderer('status', { connected: true });
    topics.forEach(t =>
      client.subscribe(t, { qos: 0 }, (err) =>
        sendToRenderer('log', err ? `Subscribe failed: ${t}` : `Subscribed: ${t}`))
    );
  });

  client.on('reconnect', () => sendToRenderer('log', 'Reconnecting...'));
  client.on('error', (e) => sendToRenderer('log', `Error: ${e.message}`));
  client.on('close', () => sendToRenderer('status', { connected: false }));

  client.on('message', async (topic, payload) => {
    try {
      const raw = payload.toString('utf8').trim();
      if (!raw) return;

      const text = parsePayload(raw);
      sendToRenderer('message', { topic, text });

      const chunks = splitForTTS(text, chunkSize);
      for (const c of chunks) {
        try {
          await postToOneComme(c);
        } catch (e) {
          sendToRenderer('log', `POST fail: ${e.message}`);
        }
        if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
      }
    } catch (err) {
      sendToRenderer('log', `Handle message error: ${err?.message || err}`);
    }
  });
}

function stopBridge() {
  if (client) {
    try { client.end(true); } catch {}
    client = null;
    sendToRenderer('status', { connected: false });
    sendToRenderer('log', 'Bridge stopped');
  }
}

// --- IPC: Renderer からの操作 ---
ipcMain.handle('get-config', () => store.store);

ipcMain.handle('set-config', (_e, kv) => {
  Object.entries(kv || {}).forEach(([k, v]) => store.set(k, v));
  // 自動起動フラグの即時反映
  const openAtLogin = !!store.get('autoStart');
  app.setLoginItemSettings({ openAtLogin, openAsHidden: true });
  return store.store;
});

ipcMain.handle('start', async () => { startBridge(); return true; });
ipcMain.handle('stop',  async () => { stopBridge();  return true; });

// --- 終了処理 ---
app.on('before-quit', () => {
  stopBridge();
});