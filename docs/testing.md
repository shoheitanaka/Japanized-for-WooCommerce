# テスト手順

Japanized for WooCommerce では、コード品質の維持のために以下のテスト手段を用意しています。

| 種類 | ツール | 対象 |
|------|--------|------|
| コーディング規約チェック | PHP_CodeSniffer (PHPCS) | PHP ファイル全体 |
| ユニットテスト | PHPUnit | PHP クラス・関数 |
| E2E テスト | Playwright | ブラウザ操作・画面動作 |

---

## 前提条件

### 共通
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) が起動していること
- Node.js 20 以上、npm 10 以上
- Composer がインストール済み

### ローカル開発環境の起動

```bash
# wp-env を起動（初回は Docker イメージのダウンロードに数分かかります）
npx wp-env start
```

起動後のアクセス先：

| 用途 | URL |
|------|-----|
| 開発サイト | http://localhost:8890 |
| テストサイト | http://localhost:8891 |

---

## 1. PHPCS — コーディング規約チェック

WordPress Coding Standards および PHP 互換性チェックを実施します。

### セットアップ（初回のみ）

```bash
composer install
```

### チェックの実行

```bash
# 違反箇所をリストアップ
composer lint

# 自動修正できる箇所を修正
composer format
```

### チェック対象

`.phpcs.xml.dist` に定義されています。主な設定：

- 対象: プロジェクトルート以下の `.php` ファイル
- 除外: `vendor/`, `node_modules/`, `tests/`
- ルール: WordPress Coding Standards + PHPCompatibilityWP（PHP 8.1+）

### CI での挙動

Pull Request 時に GitHub Actions が `composer lint` を自動実行します。エラーが残った状態でマージしないでください。

---

## 2. PHPUnit — ユニットテスト

PHP クラスのロジックを WordPress テスト環境上で検証します。

### セットアップ（初回のみ）

```bash
# テスト用データベースのセットアップ（wp-env 起動後に実行）
composer test-install
```

### テストの実行

```bash
composer test
```

### テストファイルの場所

```
tests/
├── Unit/
│   ├── test-jp4wc-delivery-payment.php      # 配送フィルタ・決済連携
│   ├── test-jp4wc-delivery-validation.php   # チェックアウト入力バリデーション
│   ├── test-jp4wc-delivery-saving.php       # 注文保存処理
│   ├── test-jp4wc-delivery-blocks-validation.php  # ブロックチェックアウト検証
│   └── test-jp4wc-yomigana-blocks-validation.php  # 読み仮名フィールド検証
└── bootstrap.php
```

各テストクラスは `WP_UnitTestCase` を継承しています。

---

## 3. Playwright E2E テスト — ブラウザ操作テスト

実際のブラウザを使ってチェックアウト・管理画面を操作し、機能を検証します。

### セットアップ（初回のみ）

```bash
# Node.js 依存パッケージのインストール
npm install

# Playwright ブラウザのインストール
npx playwright install chromium
```

### テストの実行

```bash
# 全テストを実行（wp-env テストサイト: http://localhost:8891 を使用）
npm run test:e2e

# UI モードで実行（ブラウザの動作をリアルタイムで確認）
npm run test:e2e:ui

# デバッグモードで実行（ステップ実行）
npm run test:e2e:debug

# テスト結果レポートを開く
npm run test:e2e:report
```

### テストファイルの場所

```
tests/e2e/
├── utils/
│   └── helpers.ts              # 共通ヘルパー関数（ログイン・商品作成など）
├── global-setup.ts             # 全テスト共通の初期化処理
├── checkout-classic.spec.ts    # Classic Checkout（ショートコード）
├── checkout-blocks.spec.ts     # Block Checkout（ブロックエディタ）
├── admin-settings.spec.ts      # 管理画面設定ページ
└── admin-order.spec.ts         # 管理画面注文一覧・詳細
```

### テスト内容

| ファイル | テスト内容 |
|----------|------------|
| `checkout-classic.spec.ts` | COD決済でのサンクスページ遷移（バグ #166 回帰テスト）、配送日時バリデーション |
| `checkout-blocks.spec.ts` | 読み仮名フィールドの表示・非表示、CSS順序（位置）、必須バリデーションエラー |
| `admin-settings.spec.ts` | 設定ページの読み込み、トグル保存の永続化、REST API レスポンス |
| `admin-order.spec.ts` | 注文一覧の配送日カラム表示、注文編集画面のメタボックス、注文メタデータ |

### 環境変数

| 変数 | デフォルト | 説明 |
|------|-----------|------|
| `WP_BASE_URL` | `http://localhost:8891` | テスト対象の WordPress URL |
| `WP_APP_PASSWORD` | （global-setup が自動生成） | WordPress Application Password |

別環境に対してテストを実行する場合：

```bash
WP_BASE_URL=https://staging.example.com npm run test:e2e
```

### global-setup の処理

`tests/e2e/global-setup.ts` が全テスト実行前に一度だけ動作し、以下を自動で設定します：

1. WP-CLI で WordPress Application Password を発行
2. COD（代引き）支払いゲートウェイを有効化
3. 送料無料ゾーン（Japan (e2e)）を作成

### 認証について

REST API の認証に **WordPress Application Passwords** を使用しています。
`global-setup.ts` が `wp user application-password create admin playwright-e2e --porcelain` を実行して自動発行し、`tests/e2e/.auth/credentials.json`（`.gitignore` 対象）に保存します。

---

## 全テストの一括実行

```bash
# 1. PHPCS チェック
composer lint

# 2. PHPUnit
composer test

# 3. E2E テスト
npm run test:e2e
```
