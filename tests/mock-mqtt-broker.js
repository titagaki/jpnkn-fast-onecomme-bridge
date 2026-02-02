/**
 * テスト用ローカルMQTTブローカー（モック）
 * 
 * jpnkn-api-spec.md の仕様に基づき、ローカルでMQTTブローカーを起動し、
 * サンプルメッセージを定期的に配信します。
 * 
 * 使用方法:
 *   node tests/mock-mqtt-broker.js
 * 
 * 環境変数:
 *   MQTT_PORT - ブローカーポート (デフォルト: 1883)
 *   PUBLISH_INTERVAL - メッセージ送信間隔ms (デフォルト: 5000)
 */

import Aedes from 'aedes';
import { createServer } from 'net';

const PORT = parseInt(process.env.MQTT_PORT || '1883', 10);
const PUBLISH_INTERVAL = parseInt(process.env.PUBLISH_INTERVAL || '5000', 10);
const USERNAME = 'genkai';
const PASSWORD = '7144';

// Aedes MQTTブローカー作成
const aedes = new Aedes();
const server = createServer(aedes.handle);

// 認証ハンドラ（jpnkn仕様に準拠）
aedes.authenticate = (client, username, password, callback) => {
  const pwStr = password ? password.toString() : '';
  if (username === USERNAME && pwStr === PASSWORD) {
    console.log(`[AUTH] Client ${client.id} authenticated successfully`);
    callback(null, true);
  } else {
    console.log(`[AUTH] Client ${client.id} authentication failed (user=${username})`);
    callback(null, false);
  }
};

// クライアント接続イベント
aedes.on('client', (client) => {
  console.log(`[CONNECT] Client connected: ${client.id}`);
});

// クライアント切断イベント
aedes.on('clientDisconnect', (client) => {
  console.log(`[DISCONNECT] Client disconnected: ${client.id}`);
});

// サブスクライブイベント
aedes.on('subscribe', (subscriptions, client) => {
  const topics = subscriptions.map(s => s.topic).join(', ');
  console.log(`[SUBSCRIBE] Client ${client.id} subscribed to: ${topics}`);
});

// 発行イベント（デバッグ用）
aedes.on('publish', (packet, client) => {
  if (client) {
    console.log(`[PUBLISH] Client ${client.id} published to ${packet.topic}`);
  }
});

// サーバー起動
server.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('Mock MQTT Broker started');
  console.log('='.repeat(60));
  console.log(`Port: ${PORT}`);
  console.log(`Username: ${USERNAME}`);
  console.log(`Password: ${PASSWORD}`);
  console.log(`Publish interval: ${PUBLISH_INTERVAL}ms`);
  console.log('');
  console.log('Connect with: mqtt://localhost:' + PORT);
  console.log('Subscribe to: bbs/# or bbs/news etc.');
  console.log('='.repeat(60));
  console.log('');

  // サンプルメッセージを定期配信
  startSamplePublisher();
});

// サンプルレス番号カウンター
let resNumber = 1;

// サンプル投稿者リスト
const sampleUsers = [
  { name: '名無しさん', id: 'ABC12345' },
  { name: 'テスト太郎', id: 'XYZ99999' },
  { name: '匿名希望', id: 'DEF00001' },
  { name: 'ゲスト', id: 'GUEST001' },
];

// サンプルメッセージリスト
const sampleMessages = [
  'これはテストメッセージです。',
  'こんにちは、世界！',
  'MQTTブリッジのテスト中です。',
  '今日も良い天気ですね。',
  '誰か見てますか？',
  'わんコメに表示されるかな？',
  '長いメッセージのテストです。複数行にわたるコメントがどのように処理されるか確認しています。改行も含めてテストしてみましょう。',
  '特殊文字テスト: <>&"\'',
  '絵文字テスト: 🎉🔥✨',
];

/**
 * サンプルメッセージを定期的にパブリッシュする
 */
function startSamplePublisher() {
  setInterval(() => {
    const user = sampleUsers[Math.floor(Math.random() * sampleUsers.length)];
    const message = sampleMessages[Math.floor(Math.random() * sampleMessages.length)];
    
    // jpnkn形式のペイロード
    const payload = {
      board: 'news',
      thread: '1234567890',
      num: resNumber++,
      name: user.name,
      mail: 'sage',
      date: formatDate(new Date()),
      id: user.id,
      message: message,
      is_new: true
    };

    const topic = `bbs/${payload.board}`;
    const payloadStr = JSON.stringify(payload);

    // パブリッシュ
    aedes.publish({
      topic: topic,
      payload: Buffer.from(payloadStr),
      qos: 0,
      retain: false
    }, (err) => {
      if (err) {
        console.error('[ERROR] Publish failed:', err);
      } else {
        console.log(`[PUBLISH] ${topic}`);
        console.log(`  No.${payload.num} ${payload.name} (${payload.id})`);
        console.log(`  ${payload.message.substring(0, 50)}${payload.message.length > 50 ? '...' : ''}`);
        console.log('');
      }
    });
  }, PUBLISH_INTERVAL);
}

/**
 * 日付をjpnkn形式にフォーマット
 */
function formatDate(date) {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const day = days[date.getDay()];
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const sec = String(date.getSeconds()).padStart(2, '0');
  return `${y}/${m}/${d}(${day}) ${h}:${min}:${sec}`;
}

// 終了ハンドリング
process.on('SIGINT', () => {
  console.log('\nShutting down broker...');
  aedes.close(() => {
    server.close(() => {
      console.log('Broker stopped.');
      process.exit(0);
    });
  });
});
