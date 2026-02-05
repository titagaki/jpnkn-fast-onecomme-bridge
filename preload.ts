// preload.ts - CommonJS形式（Electronのpreloadスクリプトはsandbox環境）
import type { IpcRendererEvent } from 'electron';
const { contextBridge, ipcRenderer } = require('electron');

export interface BridgeAPI {
  loadConfig: () => Promise<Record<string, unknown>>;
  saveConfig: (kv: Record<string, unknown>) => Promise<Record<string, unknown>>;
  start: () => Promise<boolean>;
  stop: () => Promise<boolean>;
  getProfileImage: () => Promise<string | null>;
  onStatusUpdate: (cb: (data: unknown) => void) => void;
  onLog: (cb: (data: unknown) => void) => void;
}

contextBridge.exposeInMainWorld('bridge', {
  loadConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (kv: Record<string, unknown>) => ipcRenderer.invoke('set-config', kv),
  start: () => ipcRenderer.invoke('start'),
  stop: () => ipcRenderer.invoke('stop'),
  getProfileImage: () => ipcRenderer.invoke('get-profile-image'),
  onStatusUpdate: (cb: (data: unknown) => void) => ipcRenderer.on('status', (_e: IpcRendererEvent, data: unknown) => cb(data)),
  onLog: (cb: (data: unknown) => void) => ipcRenderer.on('log', (_e: IpcRendererEvent, data: unknown) => cb(data))
} as BridgeAPI);

