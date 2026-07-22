# claude-brain 関門1依頼 — M1設計レビュー

## 依頼

M1（土台）の実装前設計を正本と照合してください。実装可否を `DESIGN_PASS` または `DESIGN_FAIL` で先頭に示し、FAIL時は正本の§番号を添えてください。

## 必ず読む絶対パス

1. `/home/ayame/project/tea-rose/AGENTS.md`
2. `/home/ayame/project/tea-rose/docs/ティーローズ_完成モック_v2_5-2.html`
3. `/home/ayame/project/tea-rose/docs/ティーローズ_プロトタイプ仕様書_v2_2.md`
4. `/home/ayame/project/tea-rose/docs/ティーローズ_技術決定書_v1_1.md`
5. `/home/ayame/project/tea-rose/docs/orders/M1_土台.md`
6. `/home/ayame/project/tea-rose/docs/監督記述_AI相互監視の動線.md`
7. `/home/ayame/project/tea-rose/docs/受け入れ条件YESNO表_トークン照合表.md`

## 参照すべき正本箇所

- AGENTS.md §0、§2相談1〜3、§3、§4、§5、§8、起動時セルフチェック
- 全体仕様書 §3、§4、§6、§7、§15〜§18、§22、§25
- 技術決定書 論点1、論点2、論点3、論点5
- M1発注書 全文
- 監督記述「関門1」

## 設計

### ファイル構成

- `src/App.jsx`：SPAの画面state、M1画面遷移、トースト、データロード/保存の結線
- `src/data.js`：仕様書§16を変えない初期 `Data`（写真13件・アルバム4件）
- `src/storage.js`：IndexedDBだけを使う永続化層。DB内の単一ストアに保存キー `tearose-data-v1` で§16の `Data` 全体を保存・読込・初期化
- `src/image.js`：`createImageBitmap` → canvas → 長辺1280px → JPEG品質0.72。失敗時は元ファイルを保存せず、呼出元へ失敗を返す
- `src/App.css`：モックの `:root` トークンと既存CSSクラスをそのまま移植（新規デザインなし）
- `src/index.css`：モック同等の全体レイアウトに限定

### データの流れ

1. 初回起動時にIndexedDBの `tearose-data-v1` を読む。
2. 未保存なら初期写真13件・初期アルバム4件をメモリへ設定し、同じDataをIndexedDBへ保存する。
3. 画面位置・選択・一時取り込みはReact stateだけで持ち、永続化しない。
4. 端末写真/カメラのFileを1件ずつcanvas変換する。成功分だけ一時写真へ追加し、失敗分は破棄する。
5. M1では `次へ` 押下時に、選択した変換済み写真を新規IDのまま `photos` へ追加し、IndexedDB保存とストーリーホームの `きょう` 一覧更新まで完結する。M2着手時に、この保存直前へ編集工程を接続する。
6. 保存時はDataモデルを変えずphotos/albums全体をIndexedDBへ上書きする。失敗は仕様書§3の容量文言で通知し、メモリ上のDataも保存前へ戻す。
7. 変換失敗時は、claude-brain初回レビューのQ1回答に従い仕様書§17の `写真をえらび直してください` を通知し、失敗写真だけを破棄する。
8. 外部送信は行わない。

### M1画面

- ストーリーホーム：モックの `.page-header`、`.upload-hero`、`.day-list`、`.story-grid`、`.empty-today` を移植。
- 写真選択：`.back-header`、`.library-row`、`.picker-grid`、`.cam-card`、`.fixed-actions` を移植。ファイルinputは写真用 `multiple`、カメラ用 `capture="environment"`。
- 下部ナビ：3項目をモック文言・クラスのまま表示。M1中のアルバム/設定は文字を創作せず空の画面枠のみ。
- 写真タップ：M2未接続中はトースト等を創作せず何もしない。M2着手後に編集へ接続する。

## 未決候補への回答依頼（具体的な選択肢）

初回レビューで次の回答を受領し、改訂設計へ反映済みです。

1. Q1=A：変換失敗通知は仕様書§17の `写真をえらび直してください`。
2. Q2=B：M1だけの写真タップは既存スタイルのまま、クリック可能だが処理なし。
3. Q3=A：M1だけのアルバム・設定はモック同様のナビから空の画面枠へ切替。
4. Q4=A：技術決定書v1.1を正として続行し、発注書のv1.0参照は保留記録。

## 初回レビュー指摘への修正

- `DESIGN_FAIL`（major）：M1で新規取り込み写真を一時stateに留める設計はM1-5／M1-8に反する。
- 修正：上記データフロー5〜6のとおり、M1の `次へ` でIndexedDB保存と `きょう` 一覧更新まで完結する設計へ変更。

## 期待する回答形式

```text
DESIGN_PASS または DESIGN_FAIL
根拠: <正本ファイルと§番号>
Q1: A/B + 根拠
Q2: A/B + 根拠
Q3: A/B + 根拠
Q4: A/B + 根拠
指摘: blocker/major/minor の箇条書き（なければ「なし」）
```
