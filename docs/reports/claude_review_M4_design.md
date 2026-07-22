# claude-brain 関門1依頼 — M4設計レビュー

## 読む絶対パス

- `/home/ayame/project/tea-rose/AGENTS.md`
- `/home/ayame/project/tea-rose/docs/ティーローズ_完成モック_v2_5-2.html`（巨大バンドル一括Read禁止）
- `/home/ayame/project/tea-rose/docs/ティーローズ_プロトタイプ仕様書_v2_2.md`
- `/home/ayame/project/tea-rose/docs/ティーローズ_技術決定書_v1_1.md`
- `/home/ayame/project/tea-rose/docs/orders/M4_ビューア設定.md`
- `/home/ayame/project/tea-rose/docs/監督記述_AI相互監視の動線.md`
- `/home/ayame/project/tea-rose/docs/受け入れ条件YESNO表_トークン照合表.md`
- `/home/ayame/project/tea-rose/src/App.jsx`
- `/home/ayame/project/tea-rose/src/storage.js`

## 設計

- Viewerを日別/Album共通で実装。ids/title/index/done/autoだけReact state。PhotoはphotoMap参照。
- 進行バー、件数、編集、閉じる、左右tap zone、左次/右前/下閉じるtouch、5秒timer、tap時自動停止、終了3行/2ボタンを§13どおり実装。
- Overlayはx/y/size%を表示幅に掛け、編集と同じ相対サイズ。caption空は帯を描画しない。
- Storyの `この日をみる`、Albumカード/`ひらく`、Viewer `✎ 編集` を既存導線へ接続。
- 設定にまるごと保存、32%固定meter、ホーム追加、QR表示/閉じる/読取案内、デモ初期化を追加。
- 初期化はIndexedDBのDataキーを削除後、初期13写真/4Albumを再保存し、画面stateをstoryへ戻す。設定以外のstateは永続化しない。
- Vite baseは既存 `/tea-rose/` を読取確認のみ。変更しない。公開URLはhuman_required。

## 未決照会

`ファイルに書き出す` / `ファイルから読み込む` は仕様書§14.1が「モックトースト」とだけ記し専用文言なし、凍結モックの現行Settingsにも当該ボタンが見つからない。A: §17の確定文言 `この機能は開発予定です`、B: 文言未決としてM4停止。どちらが正本根拠で可能ですか。

## 期待形式

```text
DESIGN_PASS または DESIGN_FAIL
Q1: A/B + 根拠
指摘: blocker/major/minor（なければなし）
```
