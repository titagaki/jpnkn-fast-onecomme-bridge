# アーキテクチャと通信フロー

本アプリは、掲示板（jpnkn）の新着レスを検知し、わんコメの外部コメント送信APIへ橋渡しするブリッジとして機能します。

## 通信シーケンス

```mermaid
sequenceDiagram
    participant J as jpnkn (Fast API)
    participant B as Bridge App (Electron)
    participant O as わんコメ (HTTP API)

    Note over B: 設定画面でURLと枠IDを入力しStart
    B->>J: MQTT/WS接続 (Subscribe)
    
    loop 監視
        J-->>B: 新着レス通知 (JSON形式)
        Note over B: ペイロードを抽出・整形
        B->>O: POST /api/comments
        Note right of O: service: externalとして受領
        O-->>B: 200 OK / 400 Error
    end
```

## 内部コンポーネント
- **Main Process (`main.js`)**: アプリのライフサイクル管理、トレイ常駐、自動起動設定を担当。
- **Renderer Process**: 設定UIの表示と、MQTT/HTTP通信の実装（またはPreload経由の制御）。
- **Config (`config.js`)**: 接続先URLやService IDなどの永続化管理。
