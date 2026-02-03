/**
 * ウィンドウ管理モジュール
 */

import { BrowserWindow } from 'electron';
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
    width: 860,
    height: 640,
    show: false,
    webPreferences: {
      preload: path.join(dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile(path.join(dirname, '..', 'src', 'index.html'));

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
