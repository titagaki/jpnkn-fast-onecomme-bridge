/**
 * IPC ハンドラー登録モジュール
 */

import { ipcMain, app, type IpcMainInvokeEvent } from 'electron';
import store, { type StoreSchema } from '../config.js';
import type { BridgeManager } from './bridge.js';

export function registerIpcHandlers(bridge: BridgeManager): void {
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

  ipcMain.handle('start', async () => {
    bridge.start();
    return true;
  });

  ipcMain.handle('stop', async () => {
    bridge.stop();
    return true;
  });
}
