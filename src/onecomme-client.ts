/**
 * わんコメ API クライアント
 */

import axios from 'axios';
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

  if (!serviceId) {
    return { success: false, error: 'Service ID が未設定のため送信をスキップしました' };
  }

  try {
    const payload = transformJpnknToOneComme(jpnknData, { serviceId, prefixResNo });
    await axios.post(`${base}/api/comments`, payload, { timeout: 10000 });
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
