#!/bin/bash
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"
npm version patch
touch "$SCRIPT_DIR/app/main.js"
bash $SCRIPT_DIR/build.sh
cp "$SCRIPT_DIR/package.json" build/
cp "$SCRIPT_DIR/../README.md" build/
cd "$SCRIPT_DIR/build"
npm publish

NEW_VERSION=$(cat package.json | jq -r .version)
git add -A
git commit -m "CLI v$NEW_VERSION"
git tag "cli-v$NEW_VERSION"
git push && git push --tags