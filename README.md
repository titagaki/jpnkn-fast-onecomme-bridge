# jpnkn Fast → わんコメ ブリッジ

**jpnkn の Fast インターフェイス（MQTT）で新着レスを購読し、わんコメ（OneComme）の HTTP API に自動転送する Windows トレイ常駐アプリ**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-31.0-47848F.svg)](https://www.electronjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 📋 概要

jpnkn（jpnkn.com）の MQTT ストリームから新着レスを取得し、わんコメ（OneComme）に外部コメントとして自動投稿します。配信中にリアルタイムで掲示板のコメントを表示・読み上げできます。

### 主な機能

- 🔄 **リアルタイム転送**: MQTT 購読 → わんコメ HTTP API へ自動 POST
- 🎯 **外部コメント対応**: OneComme の `service: external` として挿入
- 📦 **トレイ常駐**: バックグラウンド動作、システム起動時の自動起動対応

---

## 🚀 クイックスタート

### 前提条件

- Node.js 18.x 以上（LTS 推奨）
- わんコメ（OneComme）がインストール済み
- Windows 10/11

### 開発環境での実行

```bash
# 依存パッケージをインストール
npm install

# TypeScript コンパイル + アプリ起動
npm run dev
```

トレイにアイコンが表示されたら成功です。

### インストーラーのビルド

```bash
# Windows インストーラー (.exe) を生成
npm run build
```

`dist/` フォルダに NSIS インストーラーが作成されます。

---

## ⚙️ 設定方法

### 1. わんコメ（OneComme）側の準備

1. わんコメを起動
2. **右上メニュー → 設定 → API** で HTTP API を有効化
3. コメント欄を**右クリック → IDをコピー**で枠ID（Service ID）を取得
4. API エンドポイント: `http://127.0.0.1:11180`（デフォルト）

### 2. アプリの設定

トレイアイコンをクリックして設定画面を開き、以下を入力:

| 項目 | 説明 | 例 |
|------|------|-----|
| **わんコメ 枠ID（必須）** | 手順1で取得したID | `abc123-def456-...` |
| **Jpnkn Fast インターフェイス** | 購読する板ID | `mamiko` |
| **わんコメURL** | OneComme API URL | `http://127.0.0.1:11180` |
| **起動時に自動接続** | Windows起動時に自動開始 | ☑ |

設定を保存後、**Start** ボタンをクリックしてブリッジを起動します。

---

## 🔧 技術仕様

### アーキテクチャ

```
jpnkn MQTT (bbs.jpnkn.com:1883)
  ↓ 購読
[Electron Main Process]
  ↓ 変換 (src/transform.ts)
OneComme HTTP API (127.0.0.1:11180)
  ↓ POST /api/comments
わんコメに外部コメント表示
```

### 送信フォーマット

```json
{
  "service": { "id": "<枠ID>" },
  "comment": {
    "id": "jpnkn:mamiko:123456:789",
    "userId": "jpnkn:anonymous",
    "name": "名無し",
    "comment": "コメント本文"
  }
}
```

### 技術スタック

- **言語**: TypeScript 5.9
- **フレームワーク**: Electron 31.0
- **MQTT クライアント**: mqtt 5.5.0
- **HTTP クライアント**: axios 1.7.0
- **設定管理**: electron-store 9.0.0
- **テスト**: Jest 29.7.0

### プロジェクト構成

- `main.ts` - メインプロセス（MQTT購読・わんコメへ送信）
- `src/transform.ts` - jpnkn → わんコメ データ変換
- `src/renderer.ts` - 設定画面UI
- `tests/` - 単体テスト・モックサーバー
- `docs/` - 技術ドキュメント

---

## 🧪 テスト

```bash
# 単体テスト（全44テスト）
npm test

# E2Eテスト（MQTT + HTTP モック起動）
npm run test:e2e

# MQTT ブローカーのみ起動
npm run mock:mqtt

# OneComme API サーバーのみ起動
npm run mock:onecomme
```

---

## 📚 ドキュメント

### ユーザー向け
- [jpnkn API 仕様](docs/jpnkn-api-spec.md)
- [OneComme API 仕様](docs/onecomme-api-spec.md)

### 開発者向け
- [アーキテクチャ図・シーケンス図](docs/architecture.md)
- [TypeScript 移行ガイド](docs/typescript-migration.md)
- [AI 開発コンテキスト](docs/ai-context.md)

---

## 💡 使用上の注意

- **枠IDの取得**: 配信枠ごとに異なるため、わんコメのコメント欄を右クリック → 「IDをコピー」で毎回確認してください
- **トレイ常駐**: ウィンドウを閉じてもバックグラウンドで動作します。完全終了は右クリックメニューから「終了」を選択してください

---

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照

---

## 🤝 貢献

Issue や Pull Request は歓迎します。大きな変更の場合は、まず Issue で議論してください。

---

## 🔗 関連リンク

- [jpnkn.com](http://jpnkn.com/) - jpnkn 掲示板
- [OneComme](https://github.com/onecomme/onecomme) - マルチコメントビューア
- [Electron](https://www.electronjs.org/) - クロスプラットフォーム デスクトップアプリフレームワーク
