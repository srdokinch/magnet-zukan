# Phase 8: AI Tag Suggestion

## 目的

- 投稿画面と編集画面の AI タグ提案をハードコードから実連携へ置き換える。
- 画像選択時に候補を自動生成し、既存のタグ追加導線へつなぐ。
- API 障害時も固定候補で操作継続できるフェイルセーフを用意する。

## 方針

- 推論バックエンド: Supabase Edge Functions + Hugging Face Inference API（無料枠）。
- モデル: `openai/clip-vit-large-patch14` を利用したゼロショット分類。
- 推論方法: 候補タグ配列を `candidate_labels` として渡し、スコア上位を最大3件返却。
- 精度制御: スコア閾値（既定値 `0.25`）未満は除外し、低信頼時は空配列を返す。
- 失敗時: クライアントが固定候補 `["陶器", "地中海", "青色"]` へフォールバック。

## 実装内容

- `supabase/functions/suggest-tags/index.ts`
  - Base64 画像と候補タグ配列を受け取り、Hugging Face API に送信。
  - ゼロショット分類のスコアを閾値でフィルタし、`{ tags: string[], scores }` を返却。
  - CORS とエラーレスポンスを実装。
- `src/lib/magnet-tag-suggest.ts`
  - `browser-image-compression` で画像を縮小してから Edge Function を呼び出し。
  - 候補タグ配列 `AI_TAG_CANDIDATES` を Edge Function へ渡す。
  - E2E 実行時（`window.__MAGNET_ZUKAN_E2E__`）は外部呼び出しをスキップして固定候補を返却。
- `src/app/(main)/magnet/new/page.tsx`
  - 固定配列を state 化し、画像選択時に候補を再生成。
  - 取得中表示とフォールバック時トーストを追加。
- `src/app/(main)/magnet/[id]/edit/page.tsx`
  - AI提案セクションを追加し、画像差し替え時に候補を再生成。
- `tests/e2e/magnet-crud.spec.ts`
  - 固定タグ名依存を外し、AI提案セクションの先頭候補を選択するよう更新。

## 環境変数

- ローカル開発:
  - `HUGGING_FACE_API_KEY` を Supabase Edge Function 実行環境で参照可能にする。
  - 任意で `AI_TAG_MIN_SCORE_THRESHOLD`（`0`〜`1`）を設定し、タグ採用の閾値を調整する。
  - 任意で `DEBUG_AI_TAGS=true` を設定すると、レスポンスに `debug.imageLabels` など中間推論情報を含める。
- 本番:
  - `supabase secrets set HUGGING_FACE_API_KEY=...` を使用。
  - 必要に応じて `supabase secrets set AI_TAG_MIN_SCORE_THRESHOLD=0.30` のように設定する。
  - `DEBUG_AI_TAGS` は本番では通常 `false` のまま運用する。

## リスク・補足

- 外部AIサービス障害時は固定候補へフォールバックするため、投稿機能自体は継続可能。
- 画像が外部AIに送信されるため、README やプロダクトポリシーへ明記が必要。
- 無料枠の制限超過時に失敗しやすくなるため、将来的に呼び出し回数制限の導入を検討する。
