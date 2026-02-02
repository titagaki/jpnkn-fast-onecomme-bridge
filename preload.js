// preload.js - CommonJS形式（Electronのpreloadスクリプトはsandbox環境）
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bridge', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (kv) => ipcRenderer.invoke('set-config', kv),
  start: () => ipcRenderer.invoke('start'),
  stop:  () => ipcRenderer.invoke('stop'),
  on: (channel, cb) => ipcRenderer.on(channel, (_e, data) => cb(data))
});
