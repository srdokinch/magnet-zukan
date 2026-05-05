# Phase 4: Edit, Delete & Fridge DnD

## 目的

- マグネットの編集・削除を追加し、匿名セッション前提の CRUD を完成させる。
- バーチャル冷蔵庫での D&D 配置機能を実装する。
- 新規投稿で画像アップロードできるようにする。

## 実装内容

- 詳細画面に「編集する」「削除する」アクションを追加。
- 編集画面 `/magnet/[id]/edit` を新規追加し、既存データの取得・更新を実装。
- 削除時は確認ダイアログを表示し、成功後に一覧へ戻るフローを実装。
- E2E を「投稿 -> 編集 -> 削除」まで検証するシナリオへ拡張。
- バーチャル冷蔵庫 `/fridge` でマグネットをドラッグして配置変更できるように実装。
- 配置は `magnet_positions` テーブルに保存し、再訪時に復元するように実装。
- 新規投稿フォームで画像ファイル選択を受け付け、Supabase Storage にアップロードして `photo_url` を保存するように実装（未選択時はプレースホルダ画像 URL で登録可能）。
- 編集画面でも画像ファイルを差し替えて Storage にアップロードできるように実装。
- Storage バケット `magnet-photos` と RLS ポリシーを migration で追加。
- `magnet_positions` の `(user_id, magnet_id)` 一意制約を migration で追加し、冷蔵庫配置の upsert を安定化。

## 変更ファイル

- `src/app/(main)/magnet/[id]/page.tsx`
- `src/app/(main)/magnet/[id]/edit/page.tsx`
- `src/app/(main)/fridge/page.tsx`
- `src/app/(main)/magnet/new/page.tsx`
- `src/lib/magnet-photo-upload.ts`
- `src/components/auth/auth-guard.tsx`
- `supabase/migrations/003_add_magnet_photos_storage.sql`
- `supabase/migrations/004_magnet_positions_unique.sql`
- `playwright.config.ts`
- `tests/e2e/magnet-crud.spec.ts`

## 確認結果

- 2026-05-05 `npm run lint`: 成功（エラーなし）
- 2026-05-05 `npm run e2e:with-server`: 成功（投稿→編集→削除の E2E が `passed`）

## 次アクション

- E2E 成功後に `/prepush` を実行する。
