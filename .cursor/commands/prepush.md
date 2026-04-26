フェーズ単位の push 前確認を実施してください。実行のみで、commit や push はしないでください。

前提運用:
- `main`: 本番デプロイ専用（Vercel）
- `develop`: 統合ブランチ
- 各フェーズ: `feature/phase-<番号または名前>`（例: `feature/phase-1`）

確認手順:
1) `git status --short --branch` を表示
2) `git remote -v` を表示
3) 現在ブランチが `feature/phase-` 系か確認（`main` / `develop` なら停止して案内）
4) 追跡対象に秘密情報が含まれていないか確認（`.env`, `.env.local`, キー類）
5) push 先は `origin/<現在のfeatureブランチ>` であることを確認
6) フェーズ完了後の流れとして「`develop` への PR / マージ」を案内
7) 問題があれば修正案を提案して停止
8) 問題がなければ、最後に必ず次の確認文を出して停止:
   - 「事前確認は完了しました。`/push` を実行してよいですか？」
