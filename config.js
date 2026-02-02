// config.js
import Store from 'electron-store';

// jpnkn-api-spec.md: brokerUrl, username, password は固定値のため設定不要
const schema = {
  topics:      { type: 'string', default: 'mamiko' },
  onecommeBase:{ type: 'string', default: 'http://127.0.0.1:11180' },
  serviceId:   { type: 'string', default: '' },
  chunkSize:   { type: 'number', default: 120 },
  delayMs:     { type: 'number', default: 100 },
  autoStart:   { type: 'boolean', default: false }
};
const store = new Store({ schema, watch: true });
export default store;
