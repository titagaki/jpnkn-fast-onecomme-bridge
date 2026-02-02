# AI開発支援用コンテキスト資料

AIに機能追加やデバッグを依頼する際は、以下の前提条件を必ず守らせてください。

## プロジェクトの基本方針
- **技術スタック**: Electron, Node.js (JavaScript)。
- **アプリケーション形態**: Electronデスクトップアプリ（Windows向けトレイ常駐型）
- **目的**: jpnknからのMQTTメッセージを、わんコメの特定のデータ構造に変換してPOSTすること。
- **UIポリシー**: 設定画面は最小限とし、基本はシステムトレイで動作する。

## Electronアーキテクチャ
- **Main Process** (`main.js`): Node.js環境。アプリライフサイクル、MQTT接続、HTTP通信を担当。
- **Renderer Process** (`src/renderer.js`): ブラウザ環境。設定UI表示とユーザー操作を担当。
- **Preload Script** (`preload.js`): **CommonJS形式必須**。Main↔Renderer間のIPC通信ブリッジ。
- **重要**: preload.jsは`require`を使用（`import`不可）。package.jsonが`"type": "module"`でもpreloadはCommonJS。

## AIへの制約事項
1. **破壊的変更の禁止**: `app.setLoginItemSettings` による自動起動設定など、Windows OSに依存する部分は慎重に扱うこと。
2. **Electron仕様遵守**: 
   - preload.jsは必ずCommonJS形式（`const { xxx } = require('electron')`）
   - Main Processでのみ`ipcMain`を使用
   - Renderer Processでは`window.bridge`経由でのみMainと通信
3. **わんコメAPI仕様**: 送信時は `service.id`（枠ID）が必須であり、受信したコメントは `external` サービスとして扱う必要がある。
4. **エラー処理**: ネットワーク切断時の再試行（Retry）ロジックを重視すること。

## よく使うデータ構造
わんコメへ送信するBody形式：
```json
{
  "service": { "id": "USER_SETTING_SERVICE_ID" },
  "comment": {
    "id": "UNIQUE_ID",
    "userId": "jpnkn:bridge",
    "name": "SENDER_NAME",
    "comment": "MESSAGE_BODY"
  }
}
```

## わんコメAPI仕様
- **公式ドキュメント**: [わんコメ HTTP API (Postman)](https://documenter.getpostman.com/view/20406518/2s9Y5SX6EE)
- **詳細定義**: `docs/onecomme-api-spec.md` および `docs/schema-onecomme.json` を参照。
- 送信時は `service.id`（枠ID）が必須であり、受信したコメントは `external` サービスとして扱う必要がある。
