// jpnkn Fast (MQTT/WS) → OneComme (HTTP API) ブリッジ - Electron メインプロセス

import { app } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import store from './config.js';
import { createWindow, showWindow, setQuitting, getWindow } from './src/window.js';
import { createTray } from './src/tray.js';
import { BridgeManager } from './src/bridge.js';
import { registerIpcHandlers } from './src/ipc-handlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const bridge = new BridgeManager();

// --- 単一インスタンス確保 ---
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => showWindow());
}

// --- アプリ起動 ---
app.whenReady().then(() => {
  const win = createWindow(__dirname);
  createTray(__dirname, bridge);
  registerIpcHandlers(bridge);

  // 初回起動時は常にウィンドウを表示
  win.show();

  // Windows起動時にアプリを自動起動する設定
  const openAtLogin = !!store.get('autoStart');
  app.setLoginItemSettings({ openAtLogin, openAsHidden: true });
  
  // アプリ起動時にMQTT接続を自動開始する設定
  const autoStart = !!store.get('autoStart');
  if (autoStart) {
    // ウィンドウが完全にロードされた後に接続開始
    win.webContents.once('did-finish-load', () => {
      setTimeout(() => bridge.start(), 1000);
    });
  }
});

app.on('window-all-closed', () => {
  // Do nothing - keep app running in tray
});

app.on('before-quit', () => {
  setQuitting(true);
  bridge.stop();
});
