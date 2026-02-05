/**
 * わんコメ API クライアント
 */

import axios from 'axios';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import store from '../config.js';
import { transformJpnknToOneComme } from './transform.js';
import type { JpnknPayload } from './transform.js';

export interface PostResult {
  success: boolean;
  error?: string;
}

export async function postToOneComme(jpnknData: JpnknPayload): Promise<PostResult> {
  const base = (store.get('onecommeBase') || 'http://127.0.0.1:11180').replace(/\/$/, '');
  const serviceId = store.get('serviceId');
  const prefixResNo = store.get('prefixResNo');
  const useProfileImage = store.get('useProfileImage');

  if (!serviceId) {
    return { success: false, error: 'Service ID が未設定のため送信をスキップしました' };
  }

  try {
    // プロフィール画像をBase64エンコード
    let profileImagePath: string | undefined;
    if (useProfileImage) {
      try {
        const appPath = app.isPackaged ? process.resourcesPath : app.getAppPath();
        const imagePath = path.join(appPath, 'profile', 'profile.png');
        
        if (fs.existsSync(imagePath)) {
          const imageBuffer = fs.readFileSync(imagePath);
          profileImagePath = `data:image/png;base64,${imageBuffer.toString('base64')}`;
        }
      } catch (error) {
        console.error('Failed to load profile image:', error);
      }
    }

    const payload = transformJpnknToOneComme(jpnknData, { serviceId, prefixResNo, profileImagePath });
    await axios.post(`${base}/api/comments`, payload, { timeout: 10000 });
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
