/**
 * トレイアイコン管理モジュール
 */

import { Tray, Menu, nativeImage } from 'electron';
import path from 'node:path';
import { showWindow } from './window.js';
import type { BridgeManager } from './bridge.js';

let tray: Tray | null = null;

export function createTray(dirname: string, bridge: BridgeManager): Tray {
  const iconPath = path.join(dirname, '..', 'build', 'icon.ico');
  let icon: Electron.NativeImage;
  
  try {
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) throw new Error('Icon is empty');
  } catch {
    // フォールバック: 16x16 の透明PNG
    icon = nativeImage.createFromBuffer(
      Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAH0lEQVQ4T2NkYGD4z0ABYBw1YDQMqCMM/tMqDEbDAACCtwQRwQILywAAAABJRU5ErkJggg==', 'base64')
    );
  }

  tray = new Tray(icon);
  
  const menu = Menu.buildFromTemplate([
    { label: 'Open', click: () => showWindow() },
    { type: 'separator' },
    { label: 'Start', click: () => bridge.start() },
    { label: 'Stop', click: () => bridge.stop() },
    { type: 'separator' },
    { label: 'Quit', role: 'quit' }
  ]);

  tray.setToolTip('jpnkn Fast → OneComme Bridge');
  tray.setContextMenu(menu);
  tray.on('double-click', () => showWindow());

  return tray;
}
