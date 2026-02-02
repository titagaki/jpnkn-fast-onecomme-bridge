/**
 * jpnkn MQTT ペイロード → わんコメ API ペイロードへの変換モジュール
 */

export interface JpnknPayload {
  body: string;       // "名前<>メール<>日時<>本文<>" 形式
  no: string;         // レス番号（文字列）
  bbsid: string;      // 板ID
  threadkey: string;  // スレッドキー
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

  const parts = jpnknPayload.body.split('<>');
  const name = parts[0] || '名無し';
  const mail = parts[1] || '';
  const comment = parts[3] || '';
  
  if (!comment) {
    throw new Error('message is required in jpnkn payload');
  }

  // userIdはメール欄またはデフォルト値
  const userId = mail || 'jpnkn:anonymous';
  
  // commentIdを生成
  const commentId = `jpnkn:${jpnknPayload.bbsid}:${jpnknPayload.threadkey}:${jpnknPayload.no}`;

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
    const parts = j.body.split('<>');
    const name = parts[0] || '';
    const message = parts[3] || '';
    const no = j.no ? `No.${j.no} ` : '';
    const namePrefix = name ? `${name} > ` : '';
    return `${no}${namePrefix}${message}`;
  } catch {
    return raw;
  }
}


