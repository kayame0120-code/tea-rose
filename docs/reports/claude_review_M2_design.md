# claude-brain 関門1依頼 — M2設計レビュー

## 依頼

M2（編集）の実装前設計を正本と照合し、先頭を `DESIGN_PASS` または `DESIGN_FAIL` としてください。

## 必ず読む絶対パス

1. `/home/ayame/project/tea-rose/AGENTS.md`
2. `/home/ayame/project/tea-rose/docs/ティーローズ_完成モック_v2_5-2.html`（巨大バンドルのため全体一括Read禁止）
3. `/home/ayame/project/tea-rose/docs/ティーローズ_プロトタイプ仕様書_v2_2.md`
4. `/home/ayame/project/tea-rose/docs/ティーローズ_技術決定書_v1_1.md`
5. `/home/ayame/project/tea-rose/docs/orders/M2_編集.md`
6. `/home/ayame/project/tea-rose/docs/監督記述_AI相互監視の動線.md`
7. `/home/ayame/project/tea-rose/docs/受け入れ条件YESNO表_トークン照合表.md`
8. `/home/ayame/project/tea-rose/src/App.jsx`
9. `/home/ayame/project/tea-rose/src/data.js`
10. `/home/ayame/project/tea-rose/src/storage.js`

## 参照箇所

- AGENTS.md §0、§2相談2〜3、§3〜§5、§8
- 全体仕様書 §8、§16〜§18、§22、§25
- 技術決定書 論点2〜3、論点5
- M2発注書 全文、受け入れ条件M2-1〜M2-14

## 設計

### ファイル構成

- `src/App.jsx`：M1のSPAへ編集セッションstate、編集画面、確認ダイアログを追加。
- `src/data.js`：旧px overlayを写真幅340px基準のpercentへ読込時変換する `normaliseData` を追加。§16キーは変えない。
- `src/storage.js`：変更なし。保存確定時だけData全体をIndexedDBへ保存。
- `src/App.css`：モック既存の `.editor-*`、`.text-controls`、`.dialog-*` 等をそのまま追加。

### 編集セッション

1. 入口はストーリー写真タップ、日付のまとめて編集、写真選択の `次へ`、後続画面からの既存写真編集。
2. 入口で対象Photoを `structuredClone` した配列をReact stateに置き、既存Dataは変更しない。
3. 複数は1枚ずつ編集。途中の `次の写真へ（現在数/合計数）` はセッション配列だけを更新し、IndexedDBへ保存しない。
4. 最後の保存時、既存IDは同じ位置へ上書き、新規IDだけ先頭へ追加し、1回のIndexedDB transactionでDataを保存する。成功後だけ画面Dataを更新する。
5. ブラウザ `popstate` と画面の戻るは編集セッション・選択を全破棄し、入口画面へ戻す。
6. 単体既存は `変更を保存`、保存後は入口画面へ戻る。新規1枚と新規/既存混在バッチの文言は仕様書§8.8を入口と総数から決める。

### 編集操作

- 回転：`((rotation ?? 0) + 90) % 360`。
- テキスト：複数Overlay追加、内容変更、14色、選択削除、`完了` で選択解除しパネル閉じる。
- ジェスチャ：凍結モックと同じPointer Events。pointerIdごとの座標Mapを持ち、1本指は写真矩形に対するx/y%、2本指は距離比でsize%、角度差でrotationを更新。sizeは12/340*100〜72/340*100へ制限。
- caption：`キャプションを追加...`。空文字もPhotoへ保存し、ビューア側は空なら帯を出さない。
- 未実装ツール：仕様書§8.9の2種の確定トーストだけを出す。

### 削除

- 既存写真だけ `写真を削除` を表示。使用アルバム数を確認ダイアログ本文へ表示。
- 実行時にphotosから削除、全Album.playlistからID除去、cover一致なら空文字へ戻し、Data全体をIndexedDBへ保存。成功後だけ画面Data更新。

## 期待する回答形式

```text
DESIGN_PASS または DESIGN_FAIL
根拠: <正本ファイルと§番号>
指摘: blocker/major/minor の箇条書き（なければ「なし」）
```
