#!/bin/bash
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_DIR="$ROOT_DIR/app"

cd "$APP_DIR"
VERSION="$(npm version patch)"
git add -A
git commit -m "Electron release $VERSION"
git tag $VERSION
git push && git push --tags

echo ""
echo "Create a draft release at: https://github.com/laurent22/joplin/releases/tag/$VERSION"
echo ""
echo "Then run:"
echo ""
echo "git pull && node $APP_DIR/update-readme-download.js && git add -A && git commit -m 'Update website' && git push && git push --tags"