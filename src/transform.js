/**
 * jpnkn MQTT ペイロード → わんコメ API ペイロードへの変換モジュール
 */

/**
 * jpnknのMQTTペイロードをわんコメのAPIペイロードに変換する
 * @param {Object} jpnknPayload - jpnknからのMQTTペイロード
 * @param {Object} options - 変換オプション
 * @param {string} options.serviceId - わんコメの枠ID（必須）
 * @param {string} [options.authorName] - 上書き用の投稿者名（未指定時はjpnknのnameを使用）
 * @param {string} [options.authorUserId] - 上書き用のユーザーID（未指定時はjpnknのidを使用）
 * @returns {Object} わんコメAPIペイロード
 */
export function transformJpnknToOneComme(jpnknPayload, options = {}) {
  const { serviceId, authorName, authorUserId } = options;

  if (!serviceId) {
    throw new Error('serviceId is required');
  }

  if (!jpnknPayload || typeof jpnknPayload !== 'object') {
    throw new Error('Invalid jpnkn payload');
  }

  // 必須フィールドのバリデーション
  if (jpnknPayload.message === undefined || jpnknPayload.message === null) {
    throw new Error('message is required in jpnkn payload');
  }

  // jpnkn の id → onecomme の userId へマッピング
  // authorUserId が指定されていればそれを使用、なければ jpnkn の id を使用
  // jpnkn の id も無ければデフォルト値
  const userId = authorUserId || jpnknPayload.id || 'jpnkn:anonymous';

  // jpnkn の name → onecomme の name へマッピング
  // authorName が指定されていればそれを使用、なければ jpnkn の name を使用
  const name = authorName || jpnknPayload.name || '名無し';

  // jpnkn の message → onecomme の comment へマッピング
  const comment = String(jpnknPayload.message);

  // 一意のコメントIDを生成
  // board, thread, num が揃っていればそれを使用、なければタイムスタンプベース
  let commentId;
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
      is_new: jpnknPayload.is_new !== false // デフォルトtrue
    }
  };
}

/**
 * jpnknペイロードの生テキストを整形する（表示用）
 * @param {string} raw - 生のペイロード文字列
 * @returns {string} 整形されたテキスト
 */
export function parsePayload(raw) {
  try {
    const j = JSON.parse(raw);
    const no = j.num ? `No.${j.num} ` : (j.no ? `No.${j.no} ` : '');
    const name = j.name ? `${j.name} > ` : '';
    const msg = j.message ?? j.msg ?? raw;
    return `${no}${name}${msg}`;
  } catch {
    return raw;
  }
}

/**
 * テキストをTTS用に分割する
 * @param {string} text - 分割対象のテキスト
 * @param {number} n - 分割サイズ
 * @returns {string[]} 分割されたテキスト配列
 */
export function splitForTTS(text, n) {
  const parts = String(text || '')
    .replace(/\r/g, '')
    .split(/(?<=[。！？!?。\n])/)
    .map(s => s.trim())
    .filter(Boolean);
  const out = [];
  for (const p of parts) {
    for (let i = 0; i < p.length; i += n) out.push(p.slice(i, i + n));
  }
  return out.length ? out : [text];
}
