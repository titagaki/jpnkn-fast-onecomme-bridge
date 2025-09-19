// ショートハンド
const $ = (id) => document.getElementById(id);

/** ---- フォーム ↔ 設定Store の橋渡し ---- **/

function setForm(cfg) {
  $('brokerUrl').value    = cfg.brokerUrl || '';
  $('topics').value       = cfg.topics || 'bbs/#';
  $('username').value     = cfg.username || '';
  $('password').value     = cfg.password || '';
  $('onecommeBase').value = cfg.onecommeBase || 'http://127.0.0.1:11180';
  $('serviceId').value    = cfg.serviceId || '';
  $('authorName').value   = cfg.authorName || 'jpnkn';
  $('authorUserId').value = cfg.authorUserId || 'jpnkn:bridge';
  $('chunkSize').value    = cfg.chunkSize ?? 120;
  $('delayMs').value      = cfg.delayMs ?? 100;
  $('autoStart').checked  = !!cfg.autoStart;
}

function getForm() {
  return {
    brokerUrl:    $('brokerUrl').value.trim(),
    topics:       $('topics').value.trim(),
    username:     $('username').value.trim(),
    password:     $('password').value,
    onecommeBase: $('onecommeBase').value.trim(),
    serviceId:    $('serviceId').value.trim(),
    authorName:   $('authorName').value.trim(),
    authorUserId: $('authorUserId').value.trim(),
    chunkSize:    parseInt($('chunkSize').value, 10) || 120,
    delayMs:      parseInt($('delayMs').value, 10) || 100,
    autoStart:    $('autoStart').checked
  };
}

/** ---- ログ & メッセージ表示 ---- **/

function log(line) {
  const el = $('log');
  el.textContent += `${new Date().toLocaleTimeString()} ${line}\n`;
  el.scrollTop = el.scrollHeight;
}

function pushMsg(item) {
  const el = $('msgs');
  const div = document.createElement('div');
  div.textContent = `[${item.topic}] ${item.text}`;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

/** ---- 初期化 ---- **/

(async function init() {
  // 設定ロード
  const cfg = await window.bridge.getConfig();
  setForm(cfg);

  // ボタン動作
  $('save').onclick  = async () => {
    const kv = getForm();
    await window.bridge.setConfig(kv);
    log('Saved settings');
  };
  $('start').onclick = async () => {
    await window.bridge.start();
    log('Start requested');
  };
  $('stop').onclick  = async () => {
    await window.bridge.stop();
    log('Stop requested');
  };

  // メインプロセスからのイベント
  window.bridge.on('log',     (line) => log(line));
  window.bridge.on('message', (item) => pushMsg(item));
  window.bridge.on('status',  (s) => {
    const el = $('status');
    el.textContent = s.connected ? '● Connected' : '● Disconnected';
    el.style.color = s.connected ? '#0a0' : '#a00';
  });
})();