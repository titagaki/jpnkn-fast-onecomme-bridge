/**
 * IPC ハンドラー登録モジュール
 */

import { ipcMain, app, type IpcMainInvokeEvent } from 'electron';
import path from 'path';
import fs from 'fs';
import store, { type StoreSchema } from '../config.js';
import type { BridgeManager } from './bridge.js';

export function registerIpcHandlers(bridge: BridgeManager): void {
  ipcMain.handle('get-config', () => {
    return {
      topics: store.get('topics'),
      onecommeBase: store.get('onecommeBase'),
      serviceId: store.get('serviceId'),
      autoStart: store.get('autoStart'),
      prefixResNo: store.get('prefixResNo'),
      useProfileImage: store.get('useProfileImage')
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
      autoStart: store.get('autoStart'),
      prefixResNo: store.get('prefixResNo'),
      useProfileImage: store.get('useProfileImage')
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

  ipcMain.handle('get-profile-image', (): string | null => {
    try {
      const profilePath = path.join(app.getAppPath(), 'build', 'profile', 'profile.png');
      
      if (fs.existsSync(profilePath)) {
        const imageBuffer = fs.readFileSync(profilePath);
        return `data:image/png;base64,${imageBuffer.toString('base64')}`;
      }
      return null;
    } catch (error) {
      console.error('Failed to load profile image:', error);
      return null;
    }
  });
}
