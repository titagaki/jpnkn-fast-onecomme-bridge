# jpnkn-fast → わんコメ（HTTP API） Electron ブリッジ

**目的**: jpnkn の Fast インターフェイス（MQTT/WS）で新着レスを購読し、テキストを **わんコメ** の HTTP API（`POST http://127.0.0.1:11180/api/comments`）へ送って **OneComme** に“外部コメント（service: external）”として挿入する Windows 向けトレイ常駐アプリ。

---

## 使い方（最短）

1. Node.js（LTS）をインストール
2. このプロジェクト直下で:

   ```bash
   npm i
   npm run dev
   ```

   → トレイにアイコンが出ます。設定ウィンドウで **Broker URL / Topic** と **OneComme API**（通常 `http://127.0.0.1:11180`）および **Service ID**（わんコメの枠ID）を入力して **Start**。
3. パッケージ（インストーラ作成）:

   ```bash
   npm run build
   ```

## 使い方

* **OneComme 側の準備**

  * 右上メニュー → **設定 → API** で HTTP API を有効化し、必要なら許可ホストを登録。
  * わんコメの\*\*枠ID（Service ID）\*\*を取得（コメント欄右クリック→**IDをコピー**）。
  * API は通常 `http://127.0.0.1:11180` で待機します。
* **送信形式**（HTTP API *Send Comment*）

  * `POST {OneCommeBase}/api/comments`
  * Body 例：

    ```json
    {
      "service": { "id": "<枠ID>" },
      "comment": {
        "id": "ext-1726750000000",
        "userId": "jpnkn:bridge",
        "name": "jpnkn",
        "comment": "本文"
      }
    }
    ```
  * このAPI経由のコメントは **service: external** として扱われます。
* **起動設定**

  * 画面の **Auto Start** をONにすると、Windowsログイン時に\*\*バックグラウンドで自動起動（トレイ常駐）\*\*します。
  * インストール後の自動起動は、`app.setLoginItemSettings` でレジストリに登録されます。
* **ビルド**

  * `npm run build` で NSIS インストーラ（.exe）を生成します。`src/icon.ico` を用意するとアイコンが反映されます。
* **注意**

  * 外部IPから叩く場合は **設定→API** で許可ホスト設定が必要です。
  * WebSocket APIは購読用。書き込みはHTTP APIを使用します。
* **参考**：HTTP API（公式）、WebSocket API（公式）、フォーラム「POST Send Comment」cURL例。



## Documentation
- [Architecture & Sequence Diagram](docs/architecture.md)
- [AI Development Context](docs/ai-context.md)
