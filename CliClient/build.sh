#!/bin/bash

ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BUILD_DIR="$ROOT_DIR/build"

rsync -a --exclude "node_modules/" "$ROOT_DIR/app/" "$BUILD_DIR/"
rsync -a "$ROOT_DIR/../ReactNativeClient/lib/" "$BUILD_DIR/lib/"
cp "$ROOT_DIR/package.json" "$BUILD_DIR"
chmod 755 "$BUILD_DIR/main.js"