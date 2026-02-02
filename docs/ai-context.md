# AI開発支援用コンテキスト資料

AIに機能追加やデバッグを依頼する際は、以下の前提条件を必ず守らせてください。

## プロジェクトの基本方針
- **技術スタック**: Electron, Node.js (JavaScript)。
- **目的**: jpnknからのMQTTメッセージを、わんコメの特定のデータ構造に変換してPOSTすること。
- **UIポリシー**: 設定画面は最小限とし、基本はシステムトレイで動作する。

## AIへの制約事項
1. **破壊的変更の禁止**: `app.setLoginItemSettings` による自動起動設定など、Windows OSに依存する部分は慎重に扱うこと。
2. **わんコメAPI仕様**: 送信時は `service.id`（枠ID）が必須であり、受信したコメントは `external` サービスとして扱う必要がある。
3. **エラー処理**: ネットワーク切断時の再試行（Retry）ロジックを重視すること。

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
