/**
 * エンドツーエンドテスト実行スクリプト
 * 
 * モックMQTTブローカーとダミーHTTPサーバーを起動し、
 * アプリが正しくメッセージを中継できるかテストします。
 * 
 * 使用方法:
 *   node tests/e2e-test.js
 * 
 * 手順:
 *   1. このスクリプトがモックサーバー群を起動
 *   2. Electronアプリを手動で起動 (npm run dev)
 *   3. アプリの設定画面で以下を入力:
 *      - Broker URL: mqtt://localhost:1883
 *      - Username: genkai
 *      - Password: 7144
 *      - Topics: bbs/#
 *      - OneComme URL: http://127.0.0.1:11180
 *      - Service ID: test-service
 *   4. アプリでStartボタンを押す
 *   5. コンソールでメッセージの流れを確認
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('='.repeat(70));
console.log('End-to-End Test Runner');
console.log('='.repeat(70));
console.log('');

// 子プロセス管理
const processes = [];

/**
 * プロセスを起動してログをプレフィックス付きで出力
 */
function startProcess(name, scriptPath, env = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [scriptPath], {
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    processes.push({ name, proc });

    const prefix = `[${name}]`;
    const padded = prefix.padEnd(12);

    proc.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(l => l.trim());
      lines.forEach(line => console.log(`${padded} ${line}`));
    });

    proc.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter(l => l.trim());
      lines.forEach(line => console.error(`${padded} [ERR] ${line}`));
    });

    proc.on('error', (err) => {
      console.error(`${padded} Failed to start: ${err.message}`);
      reject(err);
    });

    proc.on('exit', (code) => {
      console.log(`${padded} Exited with code ${code}`);
    });

    // 起動を少し待つ
    setTimeout(() => resolve(proc), 1000);
  });
}

/**
 * 全プロセスを停止
 */
function stopAll() {
  console.log('');
  console.log('Stopping all mock servers...');
  processes.forEach(({ name, proc }) => {
    console.log(`  Stopping ${name}...`);
    proc.kill('SIGINT');
  });
}

/**
 * メイン処理
 */
async function main() {
  try {
    // 1. モックOneCommeサーバー起動
    console.log('Starting Mock OneComme Server...');
    await startProcess('OneComme', path.join(__dirname, 'mock-onecomme-server.js'), {
      HTTP_PORT: '11180'
    });

    // 2. モックMQTTブローカー起動
    console.log('Starting Mock MQTT Broker...');
    await startProcess('MQTT', path.join(__dirname, 'mock-mqtt-broker.js'), {
      MQTT_PORT: '1883',
      PUBLISH_INTERVAL: '5000'
    });

    console.log('');
    console.log('='.repeat(70));
    console.log('All mock servers are running!');
    console.log('='.repeat(70));
    console.log('');
    console.log('Next steps:');
    console.log('  1. Start the Electron app: npm run dev');
    console.log('  2. Configure the app with these settings:');
    console.log('     - Broker URL:   mqtt://localhost:1883');
    console.log('     - Username:     genkai');
    console.log('     - Password:     7144');
    console.log('     - Topics:       bbs/#');
    console.log('     - OneComme URL: http://127.0.0.1:11180');
    console.log('     - Service ID:   test-service');
    console.log('  3. Click "Start" in the app');
    console.log('  4. Watch the logs below for message flow');
    console.log('');
    console.log('Press Ctrl+C to stop all servers');
    console.log('='.repeat(70));
    console.log('');

  } catch (err) {
    console.error('Failed to start mock servers:', err);
    stopAll();
    process.exit(1);
  }
}

// 終了シグナルハンドリング
process.on('SIGINT', () => {
  stopAll();
  setTimeout(() => process.exit(0), 1000);
});

process.on('SIGTERM', () => {
  stopAll();
  setTimeout(() => process.exit(0), 1000);
});

// 実行
main();
