import type { BridgeAPI } from '../preload.js';

declare global {
  interface Window {
    bridge: BridgeAPI;
  }
}

let running = false;

interface AppConfig {
  serviceId: string;
  topics: string;
  onecommeBase: string;
  autoStart: boolean;
  prefixResNo: boolean;
  useProfileImage: boolean;
}

const elems = {
  serviceId: document.getElementById('serviceId') as HTMLInputElement,
  topics: document.getElementById('topics') as HTMLInputElement,
  onecommeBase: document.getElementById('onecommeBase') as HTMLInputElement,
  autoStart: document.getElementById('autoStart') as HTMLInputElement,
  prefixResNo: document.getElementById('prefixResNo') as HTMLInputElement,
  useProfileImage: document.getElementById('useProfileImage') as HTMLInputElement,
  profileIcon: document.getElementById('profileIcon') as HTMLImageElement,
  saveBtn: document.getElementById('saveBtn') as HTMLButtonElement,
  startBtn: document.getElementById('startBtn') as HTMLButtonElement,
  stopBtn: document.getElementById('stopBtn') as HTMLButtonElement,
  status: document.getElementById('status') as HTMLDivElement,
  log: document.getElementById('log') as HTMLPreElement
};

/**
 * Save configuration
 */
elems.saveBtn?.addEventListener('click', async () => {
  const cfg: AppConfig = {
    serviceId: elems.serviceId.value.trim(),
    topics: elems.topics.value.trim(),
    onecommeBase: elems.onecommeBase.value.trim(),
    autoStart: elems.autoStart.checked,
    prefixResNo: elems.prefixResNo.checked,
    useProfileImage: elems.useProfileImage.checked
  };

  await window.bridge.saveConfig(cfg as unknown as Record<string, unknown>);
  appendLog('✅ 設定を保存しました');
});

/**
 * Start MQTT→OneComme bridge
 */
elems.startBtn?.addEventListener('click', async () => {
  const serviceId = elems.serviceId.value.trim();
  if (!serviceId) {
    appendLog('⚠️ Service ID (枠ID) を入力してください');
    return;
  }

  const topics = elems.topics.value.trim();
  if (!topics) {
    appendLog('⚠️ Topicを入力してください');
    return;
  }

  // 起動前に現在の設定を保存
  const cfg: AppConfig = {
    serviceId: elems.serviceId.value.trim(),
    topics: elems.topics.value.trim(),
    onecommeBase: elems.onecommeBase.value.trim(),
    autoStart: elems.autoStart.checked,
    prefixResNo: elems.prefixResNo.checked,
    useProfileImage: elems.useProfileImage.checked
  };
  await window.bridge.saveConfig(cfg as unknown as Record<string, unknown>);

  appendLog('🔄 ブリッジを起動しています...');
  await window.bridge.start();
});

/**
 * Stop MQTT→OneComme bridge
 */
elems.stopBtn?.addEventListener('click', async () => {
  await window.bridge.stop();
  appendLog('⏸️ ブリッジを停止しました');
});

/**
 * Receive status updates from main process
 */
window.bridge.onStatusUpdate((msg: unknown) => {
  const statusMsg = String(msg);
  elems.status.textContent = statusMsg;
  
  // Update button state based on connection status
  if (statusMsg.includes('Connected')) {
    running = true;
    elems.status.classList.add('connected');
    updateButtons();
  } else if (statusMsg.includes('Disconnected')) {
    running = false;
    elems.status.classList.remove('connected');
    updateButtons();
  }
});

/**
 * Receive log messages from main process
 */
window.bridge.onLog((msg: unknown) => {
  appendLog(String(msg));
});

/**
 * Load config on page load
 */
(async () => {
  const cfg = await window.bridge.loadConfig() as Partial<AppConfig>;
  if (cfg) {
    if (cfg.serviceId) elems.serviceId.value = cfg.serviceId;
    if (cfg.topics) elems.topics.value = cfg.topics;
    if (cfg.onecommeBase) elems.onecommeBase.value = cfg.onecommeBase;
    if (typeof cfg.autoStart === 'boolean') elems.autoStart.checked = cfg.autoStart;
    if (typeof cfg.prefixResNo === 'boolean') elems.prefixResNo.checked = cfg.prefixResNo;
    if (typeof cfg.useProfileImage === 'boolean') elems.useProfileImage.checked = cfg.useProfileImage;
  }

  // プロフィール画像をロード
  const profileImageData = await window.bridge.getProfileImage();
  if (profileImageData && elems.profileIcon) {
    elems.profileIcon.src = profileImageData;
    elems.profileIcon.style.display = 'inline';
  }

  updateButtons();
})();

/**
 * Update button states
 */
function updateButtons(): void {
  if (running) {
    elems.startBtn.disabled = true;
    elems.stopBtn.disabled = false;
  } else {
    elems.startBtn.disabled = false;
    elems.stopBtn.disabled = true;
  }
}

/**
 * Append log message
 */
function appendLog(msg: string): void {
  const now = new Date().toLocaleTimeString('ja-JP');
  const line = `[${now}] ${msg}\n`;
  elems.log.textContent += line;
  elems.log.scrollTop = elems.log.scrollHeight;
}
