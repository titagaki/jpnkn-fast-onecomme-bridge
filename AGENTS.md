# AGENTS.md - AI開発者向けコンテキスト

このファイルは、AIエージェントがこのプロジェクトを理解し、適切な開発支援を行うための包括的なコンテキスト情報を提供します。

## プロジェクト概要

**jpnkn Fast → わんコメ ブリッジ**は、jpnkn掲示板のMQTTストリームをリアルタイムで購読し、わんコメ（OneComme）のHTTP APIに自動転送するElectronアプリケーションです。

### 目的
- 配信者が掲示板のレスをわんコメで表示・読み上げできるようにする
- トレイ常駐型のシンプルなブリッジアプリケーションを提供する

### 技術スタック
- **言語**: TypeScript 5.9（厳格モード）
- **フレームワーク**: Electron 31.0
- **ビルド形式**: Portable .exe（インストール不要）
- **MQTT**: mqtt 5.5.0
- **HTTP**: axios 1.7.0
- **設定**: electron-store 9.0.0
- **テスト**: Jest 29.7.0 + ts-jest

## アーキテクチャ

### モジュール構成

```
main.ts                     # エントリーポイント（45行）
├── src/window.ts           # ウィンドウ管理（55行）
├── src/tray.ts             # トレイアイコン（45行）
├── src/bridge.ts           # MQTTブリッジ（90行）
│   └── src/onecomme-client.ts  # わんコメAPI呼び出し（30行）
├── src/ipc-handlers.ts     # IPCハンドラー（45行）
└── src/transform.ts        # データ変換（60行）
```

### 設計原則

1. **単一責任の原則**: 各モジュールは1つの責務のみを持つ
2. **依存性の分離**: テスト可能な疎結合な構造
3. **型安全性**: TypeScript strictモードで全ての型を明示
4. **イミュータブルな定数**: `as const` でリテラル型として固定

### Electronアーキテクチャの詳細

- **Main Process** ([main.ts](main.ts)): Node.js環境。アプリライフサイクル、MQTT接続、HTTP通信を担当
- **Renderer Process** ([src/renderer.ts](src/renderer.ts)): ブラウザ環境。設定UI表示とユーザー操作を担当
- **Preload Script** ([preload.ts](preload.ts)): Main↔Renderer間のIPCブリッジ。`contextBridge`でAPIを公開
- **重要**: プリロードスクリプトは最小限の実装に留め、IPC通信の橋渡しのみを行う

### データフロー

```
jpnkn MQTT
  ↓ (body: "名前<>mail<>日時<>本文<>", no, bbsid, threadkey)
BridgeManager (bridge.ts)
  ↓
parsePayload (transform.ts) → UI表示用テキスト
transformJpnknToOneComme (transform.ts) → わんコメペイロード
  ↓
postToOneComme (onecomme-client.ts)
  ↓
わんコメ HTTP API
```

## jpnkn API 仕様

### 現行形式（新形式のみサポート）

```typescript
interface JpnknPayload {
  body: string;       // "名前<>メール<>日時<>本文<>"
  no: string;         // レス番号（文字列）
  bbsid: string;      // 板ID
  threadkey: string;  // スレッドキー
}
```

**重要**: 旧形式（board, thread, num, message, is_new）は削除済み。新形式のみをサポート。

### MQTT接続情報

```typescript
const MQTT_CONFIG = {
  URL: 'mqtt://bbs.jpnkn.com:1883',
  USERNAME: 'genkai',
  PASSWORD: '7144',
  KEEPALIVE: 60,
  RECONNECT_PERIOD: 3000
} as const;
```

## わんコメ API 仕様

### 送信フォーマット

```typescript
interface OneCommePayload {
  service: {
    id: string;  // 枠ID（設定画面で入力）
  };
  comment: {
    id: string;      // "jpnkn:bbsid:threadkey:no"
    userId: string;  // mailフィールドまたは "jpnkn:anonymous"
    name: string;    // 名前または "名無し"
    comment: string; // 本文
  };
}
```

### エンドポイント

- **URL**: `http://127.0.0.1:11180/api/comments`
- **Method**: POST
- **Content-Type**: application/json

## 開発ガイドライン

### コーディング規約

1. **命名規則**
   - 定数: `UPPER_SNAKE_CASE`
   - 関数/変数: `camelCase`
   - 型/インターフェース: `PascalCase`
   - ファイル名: `kebab-case.ts`

2. **インポート**
   - `.js` 拡張子を明示（ESM）
   - 型インポートは `import type` を使用

3. **エラーハンドリング**
   - 明示的な型チェック
   - エラーメッセージは英語（コード内）
   - UIメッセージは日本語

### テスト戦略

**場所**: `tests/transform.test.ts`（24テスト）

**カバレッジ**:
- ✅ 基本的なマッピング（3テスト）
- ✅ mailフィールドのマッピング（2テスト）
- ✅ メッセージ本文のマッピング（4テスト）
- ✅ ID生成（3テスト）
- ✅ エラーハンドリング（4テスト）
- ✅ 出力形式の検証（1テスト）
- ✅ parsePayload（4テスト）
- ✅ 必須フィールド検証（3テスト）

**重要**: テストは新形式専用。旧形式のテストは存在しない。

### ビルド設定

- **ターゲット**: Windows portable版のみ
- **出力**: `dist/jpnkn-fast-onecomme-bridge-0.1.0-portable.exe`
- **アイコン**: `build/icon.ico`（256x256推奨）
- **ASAR**: 有効（ソースコード保護）

## よくある開発タスク

### 新しいMQTTフィールドの追加

1. `src/transform.ts` の `JpnknPayload` に型を追加
2. `transformJpnknToOneComme` 関数でマッピング処理を追加
3. `tests/transform.test.ts` にテストを追加
4. `docs/jpnkn-api-spec.md` を更新

### 新しい設定項目の追加

1. `config.ts` の `StoreSchema` に型を追加
2. `src/ipc-handlers.ts` の get-config/set-config に追加
3. `src/index.html` にUI要素を追加
4. `src/renderer.ts` で保存/読み込み処理を追加

### 新しいモジュールの追加

1. `src/` に新しい `.ts` ファイルを作成
2. 必要に応じて `main.ts` でインポート
3. export する関数/クラスは明確な型を付ける
4. テストファイルを追加

## AI開発者向け制約事項

### 破壊的変更の禁止
- `app.setLoginItemSettings` による自動起動設定など、Windows OSに依存する機能は慎重に実装すること
- 既存の動作を変更する場合は必ず理由を明示し、テストを追加すること

### Electron仕様の厳守
- preload.tsでは`contextBridge`と`ipcRenderer`のみを使用
- Main Processでのみ`ipcMain`を使用
- Renderer Processでは`window.bridge`経由でのみMainと通信
- Node.js APIへの直接アクセスは禁止（セキュリティリスク）

### エラーハンドリングの重視
- ネットワーク切断時の再接続ロジックは必須
- MQTT接続エラーは自動リトライ（reconnectPeriod: 3秒）
- HTTP POSTエラーはログ出力し、UIに通知すること

## 禁止事項

1. ❌ 旧形式（board, thread, num, message, is_new）の実装
2. ❌ インストーラー（NSIS）の追加
3. ❌ 長文分割機能の実装（削除済み）
4. ❌ バックティックでのファイル参照（Markdown内）
5. ❌ 不要な依存パッケージの追加
6. ❌ preload.tsでのNode.js API直接呼び出し

## ファイルリンク規約（Markdown内）

```markdown
✅ 正しい: [src/transform.ts](src/transform.ts)
✅ 正しい: [transform.ts](src/transform.ts#L10)
❌ 間違い: `src/transform.ts`
❌ 間違い: src/transform.ts
```

## デバッグ情報

### ログ確認

- **レンダラープロセス**: DevTools Console（Ctrl+Shift+I）
- **メインプロセス**: VSCode Debug Console
- **実行時ログ**: 設定画面の「Log」セクション

### よくある問題

1. **MQTTに接続できない**
   - ファイアウォール設定を確認
   - jpnknのサーバーステータスを確認

2. **わんコメにコメントが表示されない**
   - 枠IDが正しいか確認
   - わんコメのAPI設定が有効か確認
   - ログでPOSTエラーを確認

3. **ビルドエラー**
   - `npm run clean` してから再ビルド
   - `node_modules` を削除して `npm install`

## 関連ドキュメント

- [README.md](README.md) - ユーザー向けドキュメント
- [docs/architecture.md](docs/architecture.md) - アーキテクチャ詳細
- [docs/jpnkn-api-spec.md](docs/jpnkn-api-spec.md) - jpnkn API仕様
- [docs/onecomme-api-spec.md](docs/onecomme-api-spec.md) - わんコメAPI仕様
- [docs/typescript-migration.md](docs/typescript-migration.md) - TypeScript移行履歴

## バージョン情報

- **現在のバージョン**: 0.1.0
- **最終更新日**: 2026/02/03
- **Node.js**: 18.x以上
- **対応OS**: Windows 10/11

## 今後の開発予定

- [ ] Linux/macOS対応
- [ ] 複数板の同時購読
- [ ] コメントフィルタリング機能
- [ ] 自動更新機能
