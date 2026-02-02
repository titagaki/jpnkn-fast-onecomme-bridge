/**
 * jpnkn MQTT ペイロード → わんコメ API ペイロードへの変換モジュール
 */

export interface JpnknPayload {
  board?: string;
  thread?: string;
  num?: number;
  name?: string;
  mail?: string;
  date?: string;
  id?: string;
  message?: string;
  is_new?: boolean;
}

export interface OneCommePayload {
  service: {
    id: string;
  };
  comment: {
    id: string;
    userId: string;
    name: string;
    comment: string;
    is_new?: boolean;
  };
}

export interface TransformOptions {
  serviceId: string;
  authorName?: string;
  authorUserId?: string;
}

/**
 * jpnknのMQTTペイロードをわんコメのAPIペイロードに変換する
 */
export function transformJpnknToOneComme(
  jpnknPayload: JpnknPayload,
  options: TransformOptions
): OneCommePayload {
  const { serviceId, authorName, authorUserId } = options;

  if (!serviceId) {
    throw new Error('serviceId is required');
  }

  if (!jpnknPayload || typeof jpnknPayload !== 'object') {
    throw new Error('Invalid jpnkn payload');
  }

  if (jpnknPayload.message === undefined || jpnknPayload.message === null) {
    throw new Error('message is required in jpnkn payload');
  }

  const userId = authorUserId || jpnknPayload.id || 'jpnkn:anonymous';
  const name = authorName || jpnknPayload.name || '名無し';
  const comment = String(jpnknPayload.message);

  let commentId: string;
  if (jpnknPayload.board && jpnknPayload.thread && jpnknPayload.num !== undefined) {
    commentId = `jpnkn:${jpnknPayload.board}:${jpnknPayload.thread}:${jpnknPayload.num}`;
  } else {
    commentId = `ext-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }

  return {
    service: { id: serviceId },
    comment: {
      id: commentId,
      userId,
      name,
      comment,
      is_new: jpnknPayload.is_new !== false
    }
  };
}

/**
 * jpnknペイロードの生テキストを整形する（表示用）
 */
export function parsePayload(raw: string): string {
  try {
    const j = JSON.parse(raw) as JpnknPayload;
    const no = j.num ? `No.${j.num} ` : '';
    const name = j.name ? `${j.name} > ` : '';
    const msg = j.message ?? raw;
    return `${no}${name}${msg}`;
  } catch {
    return raw;
  }
}

/**
 * jpnknメッセージが処理対象かどうかを判定する
 */
export function shouldProcessMessage(raw: string): boolean {
  try {
    const j = JSON.parse(raw) as JpnknPayload;
    return j.is_new !== false;
  } catch {
    return true;
  }
}

/**
 * テキストをTTS用に分割する
 */
export function splitForTTS(text: string, n: number): string[] {
  const parts = String(text || '')
    .replace(/\r/g, '')
    .split(/(?<=[。！？!?。\n])/)
    .map(s => s.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    for (let i = 0; i < p.length; i += n) out.push(p.slice(i, i + n));
  }
  return out.length ? out : [text];
}
