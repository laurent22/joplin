#!/bin/bash
set -e

ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "---------------------------------------------------"
echo "Rebuild API doc..."
echo "---------------------------------------------------"
# TODO: When the apidoc command fails, it copy the failure in api.md, but shouldn't be doing that
cd "$ROOT_DIR/../CliClient"
npm run start -- apidoc > "$ROOT_DIR/../readme/api.md"
cd "$ROOT_DIR"

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

echo "---------------------------------------------------"
echo "$ROOT_DIR/build-website.js..."
echo "---------------------------------------------------"
node "$ROOT_DIR/build-website.js"

echo "---------------------------------------------------"
echo "Commit changes..."
echo "---------------------------------------------------"
git add -A && git commit -m "Update website" && git pull && git push