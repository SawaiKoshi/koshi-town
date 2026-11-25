#!/usr/bin/env bash
# koshi-town（川辺の制作街）：PR を出す前・修正のたびに実行する検証。すべて成功したら終了コード0。
# 使い方: .agents/team/gate.sh
# 注意：main にマージすると GitHub Pages の公開サイトに反映される。
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
cd "$root"
base="$(git merge-base origin/main HEAD)"

echo "== 1/7 秘密情報の混入"
.agents/team/check-secrets.sh

echo "== 2/7 空白エラー"
git diff --check "$base" --

echo "== 3/7 private なソースへのリンク"
# SISTER のソースは private。公開ポートフォリオに private なリポジトリや内部PRへのリンクを載せない
if git diff "$base" -- dist README.md prototype docs | grep -E '^\+' | grep -inE 'github\.com/SawaiKoshi/sister|sister_website'; then
  echo "上の行は private なリポジトリへの参照の可能性があります。公開サイトに載せないでください。" >&2
  exit 1
fi
echo "問題なし"

echo "== 4/7 JavaScript の構文"
for js in dist/*.js; do
  node --check "$js"
done
echo "問題なし"

echo "== 5/7 index.html が読み込むファイルの存在"
missing=0
while IFS= read -r ref; do
  case "$ref" in
    http://*|https://*|//*|data:*|\#*|mailto:*|tel:*) continue ;;
  esac
  ref="${ref%%[?#]*}"
  [ -z "$ref" ] && continue
  if [ ! -e "dist/$ref" ]; then
    echo "見つからない: dist/$ref" >&2
    missing=1
  fi
done < <(grep -oE '(src|href)="[^"]+"' dist/index.html | sed -E 's/^(src|href)="(.*)"$/\2/')
if [ "$missing" -ne 0 ]; then exit 1; fi
echo "問題なし"

echo "== 6/7 3D試作（prototype/）の JavaScript の構文"
if [ -d prototype ]; then
  for js in prototype/*.js; do
    node --check "$js"
  done
  echo "問題なし"
else
  echo "prototype/ がないので省略"
fi

echo "== 7/7 3D試作のレビュー用ファイル"
if [ -d prototype/review ]; then
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  cp -r prototype "$tmp/"
  python3 -I "$tmp/prototype/review/build_walk.py"
  if ! cmp -s <(tr -d '\r' < "$tmp/prototype/review/walk.html") <(tr -d '\r' < prototype/review/walk.html); then
    echo "prototype/review/walk.html が今のソースから作り直した結果と違います。python3 prototype/review/build_walk.py を実行してコミットしてください。" >&2
    exit 1
  fi
  missing=0
  for page in prototype/review/*.html; do
    [ "$page" = prototype/review/walk.html ] && continue
    while IFS= read -r ref; do
      case "$ref" in
        http://*|https://*|//*|data:*|\#*|mailto:*|tel:*) continue ;;
      esac
      ref="${ref%%[?#]*}"
      [ -z "$ref" ] && continue
      if [ ! -e "prototype/review/$ref" ]; then
        echo "見つからない: prototype/review/$ref（$page）" >&2
        missing=1
      fi
    done < <(grep -oE '(src|href)="[^"]+"' "$page" | sed -E 's/^(src|href)="(.*)"$/\2/')
  done
  if [ "$missing" -ne 0 ]; then exit 1; fi
  echo "問題なし"
else
  echo "prototype/review/ がないので省略"
fi

dirty="なし"
if [ -n "$(git status --porcelain)" ]; then dirty="あり（コミット前の結果です）"; fi
echo
echo "ゲート成功：SHA $(git rev-parse --short HEAD)、未コミットの変更 $dirty"
echo "表示・操作を変えた場合：python -m http.server 8000 --bind 127.0.0.1 --directory dist で開き、walkable-portfolio スキルの「動作確認」を行って PR に書いてください。"
