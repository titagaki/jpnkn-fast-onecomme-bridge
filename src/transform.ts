/**
 * jpnkn MQTT ペイロード → わんコメ API ペイロードへの変換モジュール
 */

export interface JpnknPayload {
  // 仕様書形式（旧形式）
  board?: string;
  thread?: string;
  num?: number;
  name?: string;
  mail?: string;
  date?: string;
  id?: string;
  message?: string;
  is_new?: boolean;
  // 実際のMQTT形式（新形式）
  body?: string;      // "名前<>メール<>日時<>本文<>" 形式
  no?: string;        // レス番号（文字列）
  bbsid?: string;     // 板ID
  threadkey?: string; // スレッドキー
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
  };
}

export interface TransformOptions {
  serviceId: string;
}

/**
 * jpnknのMQTTペイロードをわんコメのAPIペイロードに変換する
 */
export function transformJpnknToOneComme(
  jpnknPayload: JpnknPayload,
  options: TransformOptions
): OneCommePayload {
  const { serviceId } = options;

  if (!serviceId) {
    throw new Error('serviceId is required');
  }

  if (!jpnknPayload || typeof jpnknPayload !== 'object') {
    throw new Error('Invalid jpnkn payload');
  }

  let userId: string;
  let name: string;
  let comment: string;
  let commentId: string;

  // 新形式（body フィールド）の場合
  if (jpnknPayload.body) {
    const parts = jpnknPayload.body.split('<>');
    name = parts[0] || '名無し';
    const mail = parts[1] || '';
    comment = parts[3] || '';
    
    if (!comment) {
      throw new Error('message is required in jpnkn payload');
    }

    // userIdはメール欄またはデフォルト値
    userId = mail || 'jpnkn:anonymous';
    
    // commentIdを生成
    if (jpnknPayload.bbsid && jpnknPayload.threadkey && jpnknPayload.no) {
      commentId = `jpnkn:${jpnknPayload.bbsid}:${jpnknPayload.threadkey}:${jpnknPayload.no}`;
    } else {
      commentId = `ext-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    }
  }
  // 旧形式（message フィールド）の場合
  else {
    if (jpnknPayload.message === undefined || jpnknPayload.message === null) {
      throw new Error('message is required in jpnkn payload');
    }

    userId = jpnknPayload.id || 'jpnkn:anonymous';
    name = jpnknPayload.name || '名無し';
    comment = String(jpnknPayload.message);

    if (jpnknPayload.board && jpnknPayload.thread && jpnknPayload.num !== undefined) {
      commentId = `jpnkn:${jpnknPayload.board}:${jpnknPayload.thread}:${jpnknPayload.num}`;
    } else {
      commentId = `ext-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    }
  }

  return {
    service: { id: serviceId },
    comment: {
      id: commentId,
      userId,
      name,
      comment
    }
  };
}

/**
 * jpnknペイロードの生テキストを整形する（表示用）
 */
export function parsePayload(raw: string): string {
  try {
    const j = JSON.parse(raw) as JpnknPayload;
    
    // 新形式（body フィールド）の場合
    if (j.body) {
      const parts = j.body.split('<>');
      const name = parts[0] || '';
      const message = parts[3] || '';
      const no = j.no ? `No.${j.no} ` : '';
      const namePrefix = name ? `${name} > ` : '';
      return `${no}${namePrefix}${message}`;
    }
    
    // 旧形式（message フィールド）の場合
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
