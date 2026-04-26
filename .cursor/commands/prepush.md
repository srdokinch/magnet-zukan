フェーズ単位の push 前確認を実施してください。実行のみで、commit や push はしないでください。

前提運用:
- `main`: 本番デプロイ専用（Vercel）
- `develop`: 統合ブランチ
- 各フェーズ: `feature/phase-<番号または名前>`（例: `feature/phase-1`）

確認手順:
1) `git status --short --branch` を表示
2) 変更点をユーザーに示す（必須）
   - `git diff --name-only` と `git diff --cached --name-only` で変更ファイル一覧を表示
   - `git diff --stat` と `git diff --cached --stat` で差分サマリ（追加/削除行）を表示
   - 必要に応じて主要変更ファイルの `git diff` 抜粋を短く示す
   - 変更がない場合は「変更なし」と明示する
3) `git remote -v` を表示
4) 現在ブランチが `feature/phase-` 系か確認（`main` / `develop` なら停止して案内）
5) 追跡対象に秘密情報が含まれていないか確認（`.env`, `.env.local`, キー類）
6) push 先は `origin/<現在のfeatureブランチ>` であることを確認
7) フェーズ完了後の流れとして「`develop` への PR / マージ」を案内
8) 問題があれば修正案を提案して停止
9) 問題がなければ、最後に必ず次の確認文を出して停止:
   - 「事前確認は完了しました。`/push` を実行してよいですか？」
