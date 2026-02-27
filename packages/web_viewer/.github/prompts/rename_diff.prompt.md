---
name: rename_diff
description: show renamed source code difference using vscode
argument-hint: <hash1> <hash2> <new-file-path>
---

以下のshellscriptを実行し、指定されたファイルパスに一致するリネーム情報を抽出し、VSCodeで差分を表示してください。

```bash


#!/bin/bash

# 引数の受け取り
if [ "$#" -ne 3 ]; then
    echo "Usage: $0 <hash1> <hash2> <renamed_filepath>"
    exit 1
fi

hash1=$1
hash2=$2
renamed_filepath=$3

# 1. どちらが古い（先祖）か判定
if git merge-base --is-ancestor "$hash1" "$hash2"; then
    older=$hash1
    newer=$hash2
elif git merge-base --is-ancestor "$hash2" "$hash1"; then
    older=$hash2
    newer=$hash1
else
    echo "Error: コミット間に直接の前後関係がありません。"
    exit 1
fi

echo "Targeting file: $renamed_filepath"
echo "Order: $older (older) -> $newer (newer)"

# 2. 指定されたファイルパスに一致するリネーム情報を抽出
# awkを使用して、3列目（新しいパス）が引数と一致する行を探します
rename_info=$(git diff --name-status -M "$older" "$newer" | grep '^R' | awk -v target="$renamed_filepath" '$3 == target {print $0}')

if [ -z "$rename_info" ]; then
    echo "指定されたファイル '$renamed_filepath' のリネーム履歴が見つかりませんでした。"
    exit 1
fi

# 旧パスと新パスを抽出
old_path=$(echo "$rename_info" | awk '{print $2}')
new_path=$(echo "$rename_info" | awk '{print $3}')

echo "Match found: $old_path -> $new_path"

# 3. 拡張子の取得
ext="${new_path##*.}"

# 一時ファイルのパス
tmp_old="/tmp/old.$ext"
tmp_new="/tmp/new.$ext"

# 4. ファイルの取り出しとVSCodeでの比較
git show "$older:$old_path" > "$tmp_old" && \
git show "$newer:$new_path" > "$tmp_new" && \
code --diff "$tmp_old" "$tmp_new"

echo "VSCode diff opened."

```
