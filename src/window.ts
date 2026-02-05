/**
 * ウィンドウ管理モジュール
 */

import { BrowserWindow, Menu, MenuItem } from 'electron';
import path from 'node:path';

let win: BrowserWindow | null = null;
let isQuitting = false;

export function setQuitting(value: boolean): void {
  isQuitting = value;
}

export function getWindow(): BrowserWindow | null {
  return win;
}

export function createWindow(dirname: string): BrowserWindow {
  win = new BrowserWindow({
    width: 680,
    height: 800,
    show: false,
    resizable: true,
    autoHideMenuBar: true,
    icon: path.join(dirname, '..', 'build', 'icon.ico'),
    webPreferences: {
      preload: path.join(dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile(path.join(dirname, '..', 'src', 'index.html'));
  win.removeMenu();

  // 右クリックコンテキストメニュー（編集操作）
  win.webContents.on('context-menu', (_e, params) => {
    const menu = new Menu();
    const { editFlags, isEditable } = params;

    if (isEditable) {
      if (editFlags.canUndo) menu.append(new MenuItem({ label: '元に戻す', role: 'undo' }));
      if (editFlags.canRedo) menu.append(new MenuItem({ label: 'やり直す', role: 'redo' }));
      if (menu.items.length > 0) menu.append(new MenuItem({ type: 'separator' }));
      if (editFlags.canCut) menu.append(new MenuItem({ label: '切り取り', role: 'cut' }));
      if (editFlags.canCopy) menu.append(new MenuItem({ label: 'コピー', role: 'copy' }));
      if (editFlags.canPaste) menu.append(new MenuItem({ label: '貼り付け', role: 'paste' }));
      if (editFlags.canDelete) menu.append(new MenuItem({ label: '削除', role: 'delete' }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ label: 'すべて選択', role: 'selectAll' }));
    } else if (editFlags.canCopy) {
      menu.append(new MenuItem({ label: 'コピー', role: 'copy' }));
      menu.append(new MenuItem({ label: 'すべて選択', role: 'selectAll' }));
    }

    if (menu.items.length > 0) menu.popup();
  });

  win.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      win?.hide();
    }
  });

  return win;
}

export function showWindow(): void {
  if (win) {
    if (!win.isVisible()) win.show();
    win.focus();
  }
}

export function sendToRenderer(channel: string, payload: unknown): void {
  if (win && win.webContents) {
    win.webContents.send(channel, payload);
  }
}
