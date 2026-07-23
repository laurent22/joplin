#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Running rebrand guard checks..."

scan_paths=(
  "packages/app-desktop"
  "packages/app-mobile"
  "packages/app-clipper"
  "packages/server/src"
  "packages/lib/callbackUrlUtils.ts"
  "packages/lib/urlUtils.ts"
  ".github"
)

patterns=(
  "net\\.cozic\\.joplin-desktop"
  "net\\.cozic\\.joplin"
  "x-scheme-handler/joplin"
  "joplin://"
)

allowlist_file="tools/rebrand-allowlist.txt"
raw_matches_file="/tmp/rebrand_matches_raw.txt"
filtered_matches_file="/tmp/rebrand_matches_filtered.txt"

for pattern in "${patterns[@]}"; do
  if rg -n "$pattern" "${scan_paths[@]}" --glob '!**/*.test.*' --glob '!**/tests/**' --glob '!**/test/**' --glob '!**/readme/**' >"$raw_matches_file"; then
    if [ -f "$allowlist_file" ]; then
      rg -v -f "$allowlist_file" "$raw_matches_file" >"$filtered_matches_file" || true
    else
      cp "$raw_matches_file" "$filtered_matches_file"
    fi

    if [ ! -s "$filtered_matches_file" ]; then
      continue
    fi

    echo "Found forbidden legacy pattern: $pattern"
    while IFS= read -r line; do
      echo "$line"
    done < "$filtered_matches_file"
    exit 1
  fi
done

echo "Rebrand guard checks passed."
