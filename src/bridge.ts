/**
 * MQTT ブリッジ管理モジュール
 */

import mqtt, { type MqttClient } from 'mqtt';
import store from '../config.js';
import { parsePayload } from './transform.js';
import { postToOneComme } from './onecomme-client.js';
import { sendToRenderer } from './window.js';
import type { JpnknPayload } from './transform.js';

// MQTT接続設定
const MQTT_CONFIG = {
  URL: 'mqtt://bbs.jpnkn.com:1883',
  USERNAME: 'genkai',
  PASSWORD: '7144',
  KEEPALIVE: 60,
  RECONNECT_PERIOD: 3000
} as const;

export interface MessagePayload {
  topic: string;
  text: string;
}

export class BridgeManager {
  private client: MqttClient | null = null;

  start(): void {
    this.stop();

    const serviceId = store.get('serviceId');
    if (!serviceId) {
      sendToRenderer('log', 'Error: わんコメ枠IDが未設定です。設定を保存してからStartしてください。');
      return;
    }

    const topicsInput = store.get('topics') || 'mamiko';
    const trimmed = topicsInput.trim();
    const topic = trimmed.startsWith('bbs/') ? trimmed : `bbs/${trimmed}`;

    sendToRenderer('log', `Connecting ${MQTT_CONFIG.URL} ...`);

    this.client = mqtt.connect(MQTT_CONFIG.URL, {
      username: MQTT_CONFIG.USERNAME,
      password: MQTT_CONFIG.PASSWORD,
      keepalive: MQTT_CONFIG.KEEPALIVE,
      reconnectPeriod: MQTT_CONFIG.RECONNECT_PERIOD
    });

    this.client.on('connect', () => {
      sendToRenderer('status', '● Connected');
      this.client!.subscribe(topic, { qos: 0 }, (err) =>
        sendToRenderer('log', err ? `Subscribe failed: ${topic}` : `Subscribed: ${topic}`)
      );
    });

    this.client.on('reconnect', () => sendToRenderer('log', 'Reconnecting...'));
    this.client.on('error', (e: Error) => sendToRenderer('log', `Error: ${e.message}`));
    this.client.on('close', () => sendToRenderer('status', '● Disconnected'));

    this.client.on('message', async (_topic: string, payload: Buffer) => {
      await this.handleMessage(_topic, payload);
    });
  }

  stop(): void {
    if (this.client) {
      try {
        this.client.end(true);
      } catch {
        // ignore
      }
      this.client = null;
      sendToRenderer('status', '● Disconnected');
      sendToRenderer('log', 'Bridge stopped');
    }
  }

  private async handleMessage(topic: string, payload: Buffer): Promise<void> {
    try {
      const raw = payload.toString('utf8').trim();
      if (!raw) return;

      const parsed: JpnknPayload = JSON.parse(raw) as JpnknPayload;

      const text = parsePayload(raw);
      sendToRenderer('message', { topic, text } as MessagePayload);

      const result = await postToOneComme(parsed);
      if (!result.success) {
        sendToRenderer('log', `POST fail: ${result.error}`);
      }
    } catch (err) {
      sendToRenderer('log', `Handle message error: ${(err as Error)?.message || err}`);
    }
  }
}
