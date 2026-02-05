# TypeScript Migration Guide

## Overview

このプロジェクトは TypeScript に完全移行されました。以下のファイルが変換されています：

### 変換済みファイル

1. **main.ts** - Electron メインプロセス
   - JpnknPayload, StatusPayload, MessagePayload インターフェイスを定義
   - 全関数に型アノテーションを追加
   - import/export を TypeScript 形式に変換

2. **config.ts** - 設定ストア
   - StoreSchema インターフェイスを定義
   - electron-store の型安全なラッパーを作成
   - get/set メソッドに型チェックを追加

3. **preload.ts** - IPC ブリッジ (CommonJS)
   - BridgeAPI インターフェイスをエクスポート
   - IpcRendererEvent 型を使用
   - require() を使用（Electron の preload は CommonJS 必須）

4. **src/transform.ts** - データ変換ロジック
   - JpnknPayload, OneCommePayload, TransformOptions インターフェイスを定義
   - 全関数に明示的な戻り値の型を追加
   - エクスポートされたインターフェイスを他ファイルで再利用

5. **src/renderer.ts** - レンダラープロセス UI ロジック
   - AppConfig インターフェイスを定義
   - DOM 要素に型アサーションを追加
   - window.bridge の型安全な呼び出し

## ビルド構成

### tsconfig.json (メインプロジェクト)
- **target**: ES2020
- **module**: ESNext (Node.js の ES Modules)
- **outDir**: `./dist`
- **strict**: true (厳格な型チェック)
- **include**: `src/**/*`, `*.ts` (preload.ts を除く)

### tsconfig.preload.json (Preload 専用)
- **module**: CommonJS (Electron の要件)
- **target**: ES2020
- **outDir**: `./dist`
- **include**: `preload.ts` のみ

### package.json スクリプト

```json
{
  "build:ts": "tsc && tsc -p tsconfig.preload.json",
  "dev": "npm run build:ts && electron .",
  "build": "npm run build:ts && electron-builder"
}
```

## ディレクトリ構造

```
project/
├── main.ts           → dist/main.js
├── config.ts         → dist/config.js
├── preload.ts        → dist/preload.js (CommonJS)
├── src/
│   ├── transform.ts  → dist/src/transform.js
│   ├── renderer.ts   → dist/src/renderer.js
│   └── index.html    (変更なし、../dist/src/renderer.js を参照)
├── dist/             ← TypeScript コンパイル出力
└── tsconfig.json
```

## 開発ワークフロー

1. **コード編集**: `.ts` ファイルを編集
2. **ビルド**: `npm run build:ts`
3. **実行**: `npm run dev` (自動ビルド + Electron 起動)

## 重要なポイント

### Preload は CommonJS
Electron の preload スクリプトは sandbox 環境で実行されるため、**CommonJS** (`require()`) を使用する必要があります。

```typescript
// preload.ts
const { contextBridge, ipcRenderer } = require('electron');
```

`tsconfig.preload.json` で `"module": "CommonJS"` を指定しています。

### パス解決
- **main.ts**: `__dirname` は `dist/` を指す
  - preload: `path.join(__dirname, 'preload.js')`
  - HTML: `path.join(__dirname, '..', 'src', 'index.html')`

- **index.html**: `src/` から相対パス
  - renderer: `<script src="../dist/src/renderer.js">`

### 型の再利用
`transform.ts` からエクスポートされた型は他のファイルでインポート可能：

```typescript
// main.ts
import type { JpnknPayload } from './src/transform.js';
```

### electron-store の型
`electron-store` は適切な型定義を提供しないため、`config.ts` でカスタム型を作成：

```typescript
const store = new Store({ schema, watch: true }) as unknown as {
  get<K extends keyof StoreSchema>(key: K): StoreSchema[K];
  set<K extends keyof StoreSchema>(key: K, value: StoreSchema[K]): void;
};
```

## トラブルシューティング

### `ERR_FILE_NOT_FOUND`
- `npm run build:ts` を実行して `dist/` フォルダを生成
- `package.json` の `"main": "dist/main.js"` を確認

### Preload の型エラー
- `tsconfig.preload.json` が `"module": "CommonJS"` であることを確認
- `require()` を使用（`import` は使わない）

### renderer.js が読み込めない
- `index.html` のスクリプトパスが `../dist/src/renderer.js` であることを確認
- `type="module"` 属性があることを確認

## テスト

既存の Jest テストは JavaScript のままですが、TypeScript コードは正常に動作します：

```bash
npm test              # 単体テスト (transform.test.js)
npm run test:e2e      # E2E テスト
```

将来的に test ファイルも TypeScript に移行する場合は `ts-jest` を設定してください。

## 利点

1. **型安全性**: コンパイル時にエラーを検出
2. **IDE サポート**: 自動補完、型チェック、リファクタリング
3. **ドキュメント**: インターフェイスが API 仕様として機能
4. **保守性**: 大規模な変更が容易
5. **バグ削減**: 型エラーによるランタイムエラーを防止
