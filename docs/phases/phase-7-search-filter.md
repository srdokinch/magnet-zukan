# Phase 7: Search & Tag Filter

## 目的

- 図鑑一覧でキーワード検索・カテゴリ・タグによる絞り込みができるようにする。
- 新規投稿・編集で `magnets.tags` 列にタグ配列を保存し、AI 提案タグは `comment` ではなく `tags` に追加する。

## 実装内容

- `Magnet` 型に `tags: string[] | null` を追加。
- 共通コンポーネント `TagChipInput`（Enter / カンマ確定、チップ削除）を追加。
- 新規投稿・編集で `TagChipInput` と AI 提案タグから `tags` を編集し、Supabase の `insert` / `update` に渡す。
- 詳細画面でタグをチップ表示。
- 一覧に `MagnetListFilters`（キーワード・カテゴリ・タグチップ）と `useMemo` によるクライアント側フィルタを追加。件数は「表示中/全件」形式。
- 冷蔵庫画面の `magnets` select に `tags` を追加（型整合）。
- E2E で AI タグ追加と一覧のタグフィルタを検証。

## 変更ファイル

- `src/lib/magnets.ts`
- `src/components/magnet/tag-chip-input.tsx`
- `src/components/magnet/magnet-list-filters.tsx`
- `src/app/(main)/page.tsx`
- `src/app/(main)/magnet/new/page.tsx`
- `src/app/(main)/magnet/[id]/edit/page.tsx`
- `src/app/(main)/magnet/[id]/page.tsx`
- `src/app/(main)/fridge/page.tsx`
- `tests/e2e/magnet-crud.spec.ts`
- `docs/phases/phase-4-edit-delete.md`
- `docs/phases/phase-7-search-filter.md`

## 確認結果

- 2026-05-05 `npm run lint`: 成功（エラーなし）
- 2026-05-05 `npm run e2e:with-server`: 成功（投稿→編集→削除＋タグフィルタの E2E が `passed`）

## 次アクション

- `/prepush` で差分確認後、必要なら `/push` → `/pr` に進む。
- 件数が増えたらサーバサイド検索・ページングを別フェーズで検討する。
