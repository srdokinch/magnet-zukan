# Phase 3: Auth Anonymous

## 目的

- ログイン画面を廃止しつつ、RLSを維持したまま匿名セッションで通常利用できるようにする。

## 実装内容

- `(main)` レイアウトの `AuthGuard` を、未セッション時に `signInAnonymously` を実行する方式へ変更。
- `/login` 画面を通常利用モードの案内画面へ変更し、Googleログイン導線を停止。
- 一覧・投稿・詳細ページで、未セッション時に匿名セッション作成を試行してから処理するように変更。
- 未ログイン時の `AuthSessionMissingError` を通常ケースとして扱い、不要なエラートーストを抑制。
- `AuthGuard` で匿名サインイン失敗時にローディング表示が解除されず固まる問題を修正（失敗時も `isChecking` を解除）。

## 変更ファイル

- `src/app/(auth)/login/page.tsx`
- `src/app/(main)/layout.tsx`
- `src/components/auth/auth-guard.tsx`
- `src/app/(main)/page.tsx`
- `src/app/(main)/magnet/new/page.tsx`
- `src/app/(main)/magnet/[id]/page.tsx`

## 確認結果

- `npm run lint` 実行: 成功
- `npm run e2e` はサーバー自動起動つきで実行する運用に変更（`PLAYWRIGHT_WEB_SERVER=1`）。
- E2Eに `/magnet/new` の404検出を追加し、タイムアウト時の原因を判別しやすくした。
- 2026-04-29 時点の `npm run e2e` 失敗ログで、`Anonymous sign-ins are disabled` を確認。
- 付随対応として、Playwright のブラウザインストール不足と `EMFILE` の実行環境問題を切り分け済み。

## 次アクション

- Supabase Authで匿名認証を有効化する（Anonymous sign-ins）。
- Supabase Authで匿名認証有効化後に `npm run e2e` を再実行し、匿名セッション状態で投稿 -> 一覧 -> 詳細が通ることを確認する。
