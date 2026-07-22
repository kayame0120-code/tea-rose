# claude-brain 関門1依頼 — M3設計レビュー

## 必ず読む絶対パス

- `/home/ayame/project/tea-rose/AGENTS.md`
- `/home/ayame/project/tea-rose/docs/ティーローズ_完成モック_v2_5-2.html`（巨大バンドル一括Read禁止）
- `/home/ayame/project/tea-rose/docs/ティーローズ_プロトタイプ仕様書_v2_2.md`
- `/home/ayame/project/tea-rose/docs/ティーローズ_技術決定書_v1_1.md`
- `/home/ayame/project/tea-rose/docs/orders/M3_アルバム.md`
- `/home/ayame/project/tea-rose/docs/監督記述_AI相互監視の動線.md`
- `/home/ayame/project/tea-rose/docs/受け入れ条件YESNO表_トークン照合表.md`
- `/home/ayame/project/tea-rose/src/App.jsx`
- `/home/ayame/project/tea-rose/src/data.js`
- `/home/ayame/project/tea-rose/src/storage.js`

## 参照箇所

- AGENTS.md §0、§2相談2〜3、§3〜§5、§8
- 仕様書 §2.2、§9〜§12b、§16〜§18、§22、§25
- 技術決定書 論点2〜3、論点5
- M3-1〜M3-16

## 設計

- `src/App.jsx`へアルバム一覧、新規作成、編集2タブ、設定、表紙選択を追加。`src/App.css`はモック既存クラスだけ追加。
- Albumは§16の `id/name/playlist/cover/icon` のみ。playlistはPhoto.idだけで画像を複製しない。
- 全アルバム変更はData全体をIndexedDBへ保存成功後に画面stateへ反映。画面・タブ・選択・ドラッグ状態は永続化しない。
- 新規作成：空名は `あたらしいアルバム`、選択icon、空playlist/coverで末尾へ追加。成功後 `ストーリーからえらぶ` タブ。
- choose：全写真を日付別3列。未登録の選択IDだけplaylist末尾へ追加。登録済みは `リスト内 ×` でIDだけ除去し、cover一致時は空文字へ戻して `リストから外しました`。
- playlist行の写真タップはM2編集へ。×はIDだけ除去し元Photoを残し、cover一致時は空文字へ戻す。空の `ひらく` は指定トースト、非空はM4で再生接続。
- 設定：名前変更、表紙選択、アルバム削除。削除はAlbumだけでPhoto不変。表紙はicon（cover空）またはplaylist内Photo.id。
- 並び替え：凍結モック同じPointer Events。300ms長押し後、elementFromPointのdata-sort-idで配列を入れ替え、pointerup時にIndexedDB保存と `並び替えました`。1件は開始不可。棚・playlistの両方へ同じhookを使用。
- M2写真削除はすでに全playlist除去とcover空戻しを実装済み。

## 初回レビュー指摘への回答

- 初回 `DESIGN_FAIL` major：chooseの×とplaylist行の×でcoverリセット記述が不統一。
- 採用：B案。playlistから除去する全経路でcover一致時は空文字へ戻す。
- 最上位正本モックの共通除去関数 `Em` は、playlistからIDを除去すると同時に `cover: U.cover===A ? "" : U.cover` を実行し、playlist行の×とchooseの `リスト内 ×` の双方から呼ばれている。この実装事実を根拠とする。
- minor対応：chooseの即時除去で `リストから外しました` を明記。

## 期待する回答形式

```text
DESIGN_PASS または DESIGN_FAIL
根拠: <正本ファイルと§番号>
指摘: blocker/major/minor（なければ「なし」）
```
