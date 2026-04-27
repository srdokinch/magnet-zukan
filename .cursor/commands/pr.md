`feature/phase-*` から `develop` への PR を作成してください。
実行可能な箇所は実行し、失敗時は原因と次アクションを示して停止してください。

実行手順:
1) `git status --short --branch` で現在ブランチ確認
2) 現在ブランチが `feature/phase-` 系か検証
   - `main` / `develop` の場合は停止して警告
3) 作業ツリーがクリーンか確認（`git diff --name-only`, `git diff --cached --name-only`）
   - 変更が残っていれば停止して案内
4) 追跡先が `origin/<現在のfeatureブランチ>` か確認
   - 未設定なら `git push -u origin <現在ブランチ>` を実行
5) `develop` 向けの PR タイトル/本文を日本語で作成
   - 本文には「概要」「変更点」「確認手順」「影響範囲」「未対応事項（あれば）」を含める
6) `gh pr create --base develop --head <現在ブランチ> --title "<タイトル>" --body "<本文>"` を実行
7) 作成された PR URL を必ず表示
8) 最後に次の確認文を表示して停止:
   - 「PR作成は完了しました。続けて `/merge-develop` を実行しますか？」

注意:
- `gh` 未ログイン時は `gh auth login` を案内して停止
- 既に PR がある場合は URL を表示して終了
