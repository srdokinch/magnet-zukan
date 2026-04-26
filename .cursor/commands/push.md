フェーズ単位の Git 運用で安全に push してください。

前提運用:
- `main`: 本番デプロイ専用（Vercel）
- `develop`: 統合ブランチ
- 各フェーズ: `feature/phase-<番号または名前>`
- 基本フロー: `main` から `develop` を作成し、以後は `develop` からフェーズブランチを切る

実行手順:
1) `git status --short --branch` と `git remote -v` で状態確認
2) 現在ブランチが `feature/phase-` 系であることを確認
   - `main` / `develop` に直接 push しようとしている場合は停止して警告
3) コミット対象に秘密情報がないことを確認（`.env`, `.env.local`, キー類）
4) 問題がなければ変更をコミット
   - 既定メッセージ: `feat(phase): update phase work`
5) `origin/<現在のfeatureブランチ>` に push
6) `develop` への PR 作成を案内（可能なら作成）
7) 実行内容と結果を報告

注意:
- `origin` が未設定なら、URL入力を促して停止
- 認証エラー時は原因と次に必要な操作を示して停止
- `main` へのマージは「develop で統合・確認後」に限定
