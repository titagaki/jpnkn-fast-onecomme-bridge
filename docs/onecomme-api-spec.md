# わんコメ HTTP API 仕様メモ

本アプリがコメントを送信する「わんコメ」側のインターフェイス仕様です。

## 出典
- [わんコメ HTTP API (Postman)](https://documenter.getpostman.com/view/20406518/2s9Y5SX6EE)

## エンドポイント
- **URL**: `http://127.0.0.1:11180/api/comments`
- **Method**: `POST`

## 送信データ構造 (Send Comment)
公式の `Send Comment` 仕様に基づき、以下の構造で送信します。詳細は `docs/schema-onecomme.json` を参照してください。

### 特記事項
- **サービス識別**: 外部アプリからの送信となるため、わんコメ側では `service: external` として扱われます。
- **枠ID (`service.id`)**: わんコメの「枠」ごとに割り当てられたIDを指定する必要があります。
- **権限**: わんコメの設定で「HTTP APIを有効にする」にチェックが入っている必要があります。
