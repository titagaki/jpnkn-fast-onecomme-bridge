# わんコメ HTTP API 仕様メモ

本アプリがコメントを送信する「わんコメ」側のインターフェイス仕様です。

## 出典
- [わんコメ HTTP API (Postman)](https://documenter.getpostman.com/view/20406518/2s9Y5SX6EE)

## エンドポイント
- **URL**: `http://127.0.0.1:11180/api/comments`
- **Method**: `POST`

## 送信データ構造 (Send Comment)
公式の `Send Comment` 仕様に基づき、以下の構造で送信します。詳細は `docs/schema-onecomme.json` を参照してください。

### 完全な仕様

```json
{
  "service": {
    "id": "枠ID",
    "write": true,
    "speech": false,
    "persist": false
  },
  "comment": {
    "id": "unique-comment-id",
    "userId": "unique-user-id",
    "name": "投稿者名",
    "badges": [],
    "profileImage": "",
    "comment": "コメント本文",
    "hasGift": false,
    "isOwner": false,
    "timestamp": 10000000
  }
}
```

### フィールド詳細

#### service オブジェクト
- **id** (string, 必須): わんコメの枠ID
- **write** (boolean, 任意): コメントをログに記録するか（デフォルト: true）
- **speech** (boolean, 任意): コメントを読み上げるか（デフォルト: false）
- **persist** (boolean, 任意): コメントを永続化するか（デフォルト: false）

#### comment オブジェクト
- **id** (string, 必須): 一意のコメントID
- **userId** (string, 必須): 投稿者の一意なID
- **name** (string, 必須): 投稿者の表示名
- **comment** (string, 必須): コメント本文
- **badges** (array, 任意): バッジ情報の配列
- **profileImage** (string, 任意): プロフィール画像のURL
- **hasGift** (boolean, 任意): ギフトの有無
- **isOwner** (boolean, 任意): 配信者本人かどうか
- **timestamp** (number, 任意): タイムスタンプ（ミリ秒）

### 本アプリでの実装

本アプリでは、最小限の必須フィールドのみを送信しています：
- `service.id`: 設定画面で指定された枠ID
- `comment.id`: jpnknのレス番号から生成（`jpnkn:bbsid:threadkey:no`）
- `comment.userId`: メールアドレスまたは `jpnkn:anonymous`
- `comment.name`: 名前フィールドまたは「名無し」
- `comment.comment`: レス本文

任意フィールドは省略していますが、わんコメ側で正常に受信・表示されます。

### 特記事項
- **サービス識別**: 外部アプリからの送信となるため、わんコメ側では `service: external` として扱われます。
- **枠ID (`service.id`)**: わんコメの「枠」ごとに割り当てられたIDを指定する必要があります。
- **権限**: わんコメの設定で「HTTP APIを有効にする」にチェックが入っている必要があります。
- **任意フィールド**: 多くのフィールドは任意であり、必須フィールドのみでも動作します。
