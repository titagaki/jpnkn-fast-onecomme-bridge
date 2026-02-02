/**
 * テスト用ダミーわんコメHTTPサーバー
 * 
 * onecomme-api-spec.md の仕様に従い、POST /api/comments を待ち受けて
 * 受信内容をコンソールに出力します。
 * 
 * 使用方法:
 *   node tests/mock-onecomme-server.js
 * 
 * 環境変数:
 *   HTTP_PORT - サーバーポート (デフォルト: 11180)
 *   FAIL_RATE - 失敗レスポンスを返す確率 0-100 (デフォルト: 0)
 */

import http from 'http';

const PORT = parseInt(process.env.HTTP_PORT || '11180', 10);
const FAIL_RATE = parseInt(process.env.FAIL_RATE || '0', 10);

let requestCount = 0;

const server = http.createServer((req, res) => {
  // CORS対応
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // POST /api/comments のみ処理
  if (req.method === 'POST' && req.url === '/api/comments') {
    handlePostComment(req, res);
    return;
  }

  // GET / - ステータス確認用
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'running',
      name: 'Mock OneComme Server',
      requestCount: requestCount,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // その他は404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

/**
 * POST /api/comments ハンドラ
 */
function handlePostComment(req, res) {
  let body = '';

  req.on('data', (chunk) => {
    body += chunk.toString();
  });

  req.on('end', () => {
    requestCount++;
    const timestamp = new Date().toISOString();

    console.log('');
    console.log('='.repeat(60));
    console.log(`[${timestamp}] POST /api/comments (#${requestCount})`);
    console.log('='.repeat(60));

    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch (e) {
      console.log('[ERROR] Invalid JSON');
      console.log('Raw body:', body);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }

    // リクエスト内容を表示
    console.log('');
    console.log('Service:');
    if (parsed.service) {
      console.log(`  id: ${parsed.service.id || '(not set)'}`);
    } else {
      console.log('  (missing)');
    }

    console.log('');
    console.log('Comment:');
    if (parsed.comment) {
      console.log(`  id:      ${parsed.comment.id || '(not set)'}`);
      console.log(`  userId:  ${parsed.comment.userId || '(not set)'}`);
      console.log(`  name:    ${parsed.comment.name || '(not set)'}`);
      console.log(`  comment: ${parsed.comment.comment || '(not set)'}`);
      console.log(`  is_new:  ${parsed.comment.is_new}`);
    } else {
      console.log('  (missing)');
    }

    // バリデーション
    const errors = validatePayload(parsed);
    if (errors.length > 0) {
      console.log('');
      console.log('[VALIDATION ERROR]');
      errors.forEach(err => console.log(`  - ${err}`));
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Validation failed', details: errors }));
      return;
    }

    // 確率的に失敗させる（テスト用）
    if (FAIL_RATE > 0 && Math.random() * 100 < FAIL_RATE) {
      console.log('');
      console.log('[SIMULATED FAILURE] Returning 500 error');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Simulated server error' }));
      return;
    }

    // 成功レスポンス
    console.log('');
    console.log('[SUCCESS] Comment received successfully');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      received: {
        serviceId: parsed.service?.id,
        commentId: parsed.comment?.id,
        timestamp: timestamp
      }
    }));
  });

  req.on('error', (err) => {
    console.error('[ERROR] Request error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
  });
}

/**
 * わんコメAPI仕様に基づくバリデーション
 */
function validatePayload(payload) {
  const errors = [];

  // service オブジェクト
  if (!payload.service) {
    errors.push('service object is required');
  } else if (!payload.service.id) {
    errors.push('service.id is required');
  }

  // comment オブジェクト
  if (!payload.comment) {
    errors.push('comment object is required');
  } else {
    if (!payload.comment.id) {
      errors.push('comment.id is required');
    }
    if (!payload.comment.userId) {
      errors.push('comment.userId is required');
    }
    if (!payload.comment.name) {
      errors.push('comment.name is required');
    }
    if (payload.comment.comment === undefined || payload.comment.comment === null) {
      errors.push('comment.comment is required');
    }
  }

  return errors;
}

// サーバー起動
server.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('Mock OneComme HTTP Server started');
  console.log('='.repeat(60));
  console.log(`Port: ${PORT}`);
  console.log(`Endpoint: http://127.0.0.1:${PORT}/api/comments`);
  console.log(`Fail rate: ${FAIL_RATE}%`);
  console.log('');
  console.log('Waiting for POST requests...');
  console.log('='.repeat(60));
});

// 終了ハンドリング
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log(`Total requests received: ${requestCount}`);
    console.log('Server stopped.');
    process.exit(0);
  });
});
