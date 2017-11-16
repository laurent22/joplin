#!/bin/bash
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_DIR="$ROOT_DIR/app"

cd "$APP_DIR"
VERSION="$(npm version patch)"
git add -A
git commit -m "Electron release $VERSION"
git tag $VERSION
git push && git push --tags

echo "Open https://github.com/laurent22/joplin/tags and create a draft release for tag $VERSION"