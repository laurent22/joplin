#!/bin/bash
set -e

ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

git pull

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