#!/bin/bash
set -e

ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# echo "---------------------------------------------------"
# echo "Rebuild API doc..."
# echo "---------------------------------------------------"
# cd "$ROOT_DIR/../CliClient"
# API_DOC="$(npm run --silent start -- apidoc)"
# echo "$API_DOC" > "$ROOT_DIR/../readme/api/references/rest_api.md"
# cd "$ROOT_DIR"

echo "---------------------------------------------------"
echo "$ROOT_DIR/update-readme-download.js..."
echo "---------------------------------------------------"
node "$ROOT_DIR/update-readme-download.js"

echo "---------------------------------------------------"
echo "$ROOT_DIR/build-release-stats.js..."
echo "---------------------------------------------------"
node "$ROOT_DIR/build-release-stats.js"

echo "---------------------------------------------------"
echo "$ROOT_DIR/build-welcome.js..."
echo "---------------------------------------------------"
node "$ROOT_DIR/build-welcome.js"

cd "$ROOT_DIR/.."
echo "---------------------------------------------------"
echo "npm run buildWebsite..."
echo "---------------------------------------------------"
npm run buildWebsite

echo "---------------------------------------------------"
echo "Commit changes..."
echo "---------------------------------------------------"
git add -A && git commit -m "Update website" && git pull && git push