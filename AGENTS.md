# koshi-town（川辺の制作街）の作業ルール

## プロジェクト

- 街を歩いて建物に入り、作品を体験するポートフォリオ。`dist/` のHTML・Canvas・JavaScript（ビルドなし）。詳細は `README.md`、作品の追加や操作の変更は `.agents/skills/walkable-portfolio/SKILL.md`。
- mainへのマージで `dist/` がGitHub Pagesに公開される。マージは公開と同じ意味になる。
- SISTERのソースはprivate。公開ポートフォリオにprivateなソースや内部PRへのリンクを載せない。

## AIチーム（agent-team、2026-11-25導入）

- ユーザーはプランの承認・レビュー指摘の取捨・マージの判断を行う。統括・プラン・実装はClaude、レビューはCodexが担当する（`.agents/team/profile.md`）。使い方は `.agents/team/README.md`。
- タスクは `agent:ready` の付いたIssue。1タスクに1つのworktreeとブランチ `agent/<Issue番号>-<名前>` を使い、ほかのタスクのブランチに書き込まない。
- PRを出す前と修正のたびに `.agents/team/gate.sh` を通す。テストや確認を省略・弱めない。存在を確かめていないファイル・関数・パッケージを前提にしない。
- エージェントはマージ、mainへのpush、force pushをしない。安全ガード・ゲート（`.claude/settings.json`、`.agents/team/hooks/`、`.agents/team/gate.sh`）はユーザーだけが変更する。
- 秘密情報（`.env`、APIキー、トークン、環境変数の値）を読まない・表示しない・ログやPRに書かない。
