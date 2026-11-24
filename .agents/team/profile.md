# AIチームの設定：koshi-town（SawaiKoshi/koshi-town）

街を歩いて建物に入り、作品を体験するポートフォリオ「川辺の制作街」。`dist/` の HTML・Canvas・JavaScript（ビルドなし）。

**main へのマージ＝公開サイトへの反映**：`dist/` が変わる push で GitHub Pages が自動で公開される（`.github/workflows/pages.yml`）。完了報告では必ずこのことを書く。

## 役割とモデル

| 役割 | プロバイダー | モデル・推論の強さ | 権限 |
|------|--------------|--------------------|------|
| 統括 | Claude Code | Opus・high | 読む・`gh`（Issue のラベル、PR の確認）。コードは書かない |
| プラン | Claude Code | Opus・いちばん強い設定 | 読むだけ |
| 実装 | Claude Code（プランと同じスレッド） | Opus・medium | 自分の worktree の編集、コミット、自分のブランチへの push、draft PR |
| レビュー | Codex | 最新のコーディング向けモデル・high | read-only サンドボックス。読むだけ |

- モデル名は T3 Code のモデル選択に表示されている名前を使う。
- Codex が使えないとき：レビューは Claude の別スレッドで行い、PR 本文にそう書く。

## ゲート

```sh
.agents/team/gate.sh
```

秘密情報、空白エラー、private なリポジトリへのリンク、`dist/*.js` の構文、`index.html` が読み込むファイルの存在。

**表示・操作を変えたタスクの追加の確認**：`.agents/skills/walkable-portfolio/SKILL.md` の「動作確認」を行う。

## 触る前にユーザーの承認が要る場所

- `.github/workflows/`、`.openai/hosting.json`（公開・ホスティングの設定）
- 作品の紹介文・担当・制作段階（`dist/projects.js` の作品レコードの事実）
- SISTER など private な作品の扱い：private なソースや内部 PR へのリンクを載せない
- 外部の素材・地図・フォントの採用（出典と利用条件の記録が先）

## 例外ケースの観点（レビューで1つずつ確かめる）

- 通行判定：建物・川・家具を避ける、橋で両岸を往復できる、到達できない点を押したとき
- 入退室：入った扉の前に戻る、作品一覧から直接展示へ、ブラウザの「戻る」
- 座標：Canvas の CSS サイズ・端末のピクセル比・ズームを分けて計算しているか
- 操作：キー（矢印・WASD・E・Enter・Esc）とタップの両方、ウィンドウのフォーカスが外れたとき
- 小さいスマホ幅と PC 幅、動きを減らす設定
- 実画面・操作デモ・説明用サンプルの区別が来訪者にわかるか

## 進め方の決まりごと

- 同時進行の上限：2タスク（`dist/scene.js` など同じファイルに触るタスクは順番に）
