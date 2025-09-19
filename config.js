// config.js
const Store = require('electron-store');

const schema = {
  brokerUrl:   { type: 'string', default: 'wss://<broker>/mqtt' },
  username:    { type: 'string', default: '' },
  password:    { type: 'string', default: '' },
  topics:      { type: 'string', default: 'bbs/#' },
  onecommeBase:{ type: 'string', default: 'http://127.0.0.1:11180' },
  serviceId:   { type: 'string', default: '' },
  authorName:  { type: 'string', default: 'jpnkn' },
  authorUserId:{ type: 'string', default: 'jpnkn:bridge' },
  chunkSize:   { type: 'number', default: 120 },
  delayMs:     { type: 'number', default: 100 },
  autoStart:   { type: 'boolean', default: false }
};

module.exports = new Store({ schema, watch: true });