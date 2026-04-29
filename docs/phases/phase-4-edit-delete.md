# Phase 4: Edit & Delete

## 目的

- マグネットの編集・削除を追加し、匿名セッション前提の CRUD を完成させる。

## 実装内容

- 詳細画面に「編集する」「削除する」アクションを追加。
- 編集画面 `/magnet/[id]/edit` を新規追加し、既存データの取得・更新を実装。
- 削除時は確認ダイアログを表示し、成功後に一覧へ戻るフローを実装。
- E2E を「投稿 -> 編集 -> 削除」まで検証するシナリオへ拡張。

## 変更ファイル

- `src/app/(main)/magnet/[id]/page.tsx`
- `src/app/(main)/magnet/[id]/edit/page.tsx`
- `tests/e2e/magnet-crud.spec.ts`

## 確認結果

- 実装後に `npm run e2e` を実行して確認する。

## 次アクション

- E2E 成功後に `/prepush` を実行する。
