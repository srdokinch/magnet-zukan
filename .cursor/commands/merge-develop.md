`develop` への PR をレビュー後にマージしてください。
このコマンドは「PRが作成済み」であることを前提にします。

実行手順:
1) `git status --short --branch` で現在状態を確認
2) `gh pr view --base develop --json url,state,reviewDecision,isDraft,mergeStateStatus,headRefName,baseRefName` で対象PRを確認
3) 以下に該当したら停止して案内:
   - Draft PR
   - `reviewDecision` が未承認
   - `mergeStateStatus` が `BLOCKED` / `DIRTY`
4) 問題なければ `gh pr merge --merge --delete-branch=false` を実行
5) マージ後、`develop` を最新化:
   - `git checkout develop`
   - `git pull origin develop`
6) 最後に実行結果（マージ済みPR URL / 最新コミット）を表示

注意:
- 自動レビューのみでのマージは避け、人間レビュー承認後に実行
- CI 未完了時はマージせず、チェック完了後に再実行
