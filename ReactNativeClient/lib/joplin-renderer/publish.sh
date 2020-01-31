#!/bin/bash
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"
npm run buildAssets
npm version patch
npm publish

NEW_VERSION=$(cat package.json | jq -r .version)
git add -A
git commit -m "v$NEW_VERSION"
git tag "v$NEW_VERSION"
git push && git push --tags