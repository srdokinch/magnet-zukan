# Phase 2: CRUD MVP

## 目的

- Supabase連携で、マグネットの「投稿 -> 一覧 -> 詳細」までの最小導線を動作させる。

## 実装内容

- 一覧画面をSupabaseの `magnets` テーブル取得に接続。
- 新規投稿画面でフォーム入力を受け取り、`magnets` テーブルへ登録。
- 登録成功後に詳細画面へ遷移する導線を追加。
- 詳細画面をID指定で単体取得する表示に変更。
- エラー通知用に `sonner` のToasterをルートレイアウトへ追加。
- マグネット共通型 `Magnet` を `src/lib/magnets.ts` に追加。
- Supabase設定確認コマンド `npm run supabase:check` を追加。
- Playwrightを導入し、投稿 -> 一覧 -> 詳細のE2Eテストを追加。

## 変更ファイル

- `.cursor/rules/base.mdc`
- `src/app/layout.tsx`
- `src/app/(main)/page.tsx`
- `src/app/(main)/magnet/new/page.tsx`
- `src/app/(main)/magnet/[id]/page.tsx`
- `src/lib/magnets.ts`
- `scripts/check-supabase-setup.mjs`
- `playwright.config.ts`
- `tests/e2e/magnet-crud.spec.ts`
- `package.json`

## 確認結果

- `npm run lint` 実行: 成功（エラーなし）
- 追加した画面ロジックは型エラーなし
- `npm run supabase:check`: 環境変数未設定のため失敗（想定通り）
- `npm run e2e`: 環境変数未設定のためテストは `skipped`（想定通り）
- `.env.local` を実値へ更新後、`npm run supabase:check`: 成功
- `npm run e2e:with-server`: 成功（投稿 -> 詳細 -> 一覧のE2Eが `passed`）

## Phase 2 完了チェックリスト

- [x] 投稿画面から `photo_url` 必須で `magnets` に1件登録できる
- [x] 投稿成功後に `/magnet/[id]` へ遷移し、登録したデータが表示される
- [x] 図鑑トップに登録済みデータが一覧表示される
- [x] 一覧から詳細ページへ遷移できる
- [ ] 取得/登録エラー時に日本語トーストが表示される
- [x] `npm run lint` が成功する

## Supabase 設定手順（最初から）

1. Supabaseプロジェクトを作成  
   - [Supabase](https://supabase.com/) で新規プロジェクトを作成する
   - 作成時にリージョンとDBパスワードを設定する

2. APIキーとURLを確認  
   - Supabaseダッシュボードの `Project Settings > API` を開く
   - 次の値を控える
     - `Project URL`
     - `anon public` キー

3. 環境変数を設定  
   - ルートの `.env.local` に以下を設定する

```bash
NEXT_PUBLIC_SUPABASE_URL=あなたのProject URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=あなたのanon publicキー
```

4. テーブルを作成（SQL実行）  
   - Supabaseダッシュボードの `SQL Editor` を開く
   - `supabase/migrations/001_init.sql` の内容を貼って実行する
   - `magnets` / `fridge_layouts` / `magnet_positions` が作成されることを確認する

5. `magnets` テーブルへの動作確認データを登録  
   - Supabaseダッシュボードの `Table Editor` で `magnets` を開く
   - 最低1件、`photo_url` を入れて手動登録しておく（表示確認用）

6. アプリを起動  
   - プロジェクトで `npm run dev` を実行
   - `http://localhost:3000` にアクセス

7. 画面導線を確認  
   - `/magnet/new` で投稿できること
   - `/` で一覧表示されること
   - `/magnet/[id]` で詳細表示されること

8. セットアップ確認コマンドを実行  
   - `npm run supabase:check` を実行し、接続と必須テーブル確認を通す

9. E2Eテストを実行  
   - `npm run e2e` を実行
   - 環境変数がプレースホルダの間は自動で `skipped` になる
   - 実値設定後は投稿 -> 詳細 -> 一覧確認まで自動実行される

10. よくある詰まりポイント  
   - 環境変数の名前ミス（`NEXT_PUBLIC_` プレフィックス漏れ）
   - `001_init.sql` 未実行
   - `photo_url` 未入力（現在は必須）
   - RLSを有効化した場合のポリシー未設定（次フェーズで対応予定）

## 次アクション

- SupabaseのRLS/認証条件に合わせた保存・取得制御を追加する。
- 画像URL入力を実アップロード方式へ置き換える。
- `/prepush` で差分確認後、必要なら `/push` -> `/pr` に進む。
