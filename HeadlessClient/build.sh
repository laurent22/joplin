#!/bin/bash

ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BUILD_DIR="$ROOT_DIR/build"

rsync -a --exclude node_modules/ --exclude lib/ --exclude locales/ "$ROOT_DIR/../CliClient/app/" "$BUILD_DIR"
rsync -a --delete "$ROOT_DIR/../ReactNativeClient/"{lib,locales} "$BUILD_DIR"
rsync -a --delete "$ROOT_DIR/../Clipper/joplin-webclipper/content_scripts" "$BUILD_DIR/lib"
rsync -a "$ROOT_DIR/app/" "$BUILD_DIR"
cp -a "$ROOT_DIR/package.json" "$ROOT_DIR/package-lock.json" "$BUILD_DIR"
if [ ! -d "$BUILD_DIR/node_modules" ]; then
	cd "$BUILD_DIR" && npm install && npm run pack
	cd "$ROOT_DIR"
fi
chmod 755 "$BUILD_DIR/headless.js"
