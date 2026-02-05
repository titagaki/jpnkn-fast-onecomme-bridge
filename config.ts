// config.ts
import Store from 'electron-store';

export interface StoreSchema {
  topics: string;
  onecommeBase: string;
  serviceId: string;
  autoStart: boolean;
  prefixResNo: boolean;
  useProfileImage: boolean;
}

const schema = {
  topics: { type: 'string' as const, default: 'mamiko' },
  onecommeBase: { type: 'string' as const, default: 'http://127.0.0.1:11180' },
  serviceId: { type: 'string' as const, default: '' },
  autoStart: { type: 'boolean' as const, default: false },
  prefixResNo: { type: 'boolean' as const, default: false },
  useProfileImage: { type: 'boolean' as const, default: true }
};

// Use type assertion since electron-store doesn't export proper types
const store = new Store({ schema, watch: true }) as unknown as {
  get<K extends keyof StoreSchema>(key: K): StoreSchema[K];
  set<K extends keyof StoreSchema>(key: K, value: StoreSchema[K]): void;
};

export default store;
