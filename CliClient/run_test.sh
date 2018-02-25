#!/bin/bash
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BUILD_DIR="$ROOT_DIR/tests-build"
TEST_FILE="$1"

rsync -a --exclude "node_modules/" "$ROOT_DIR/tests/" "$BUILD_DIR/"
rsync -a "$ROOT_DIR/../ReactNativeClient/lib/" "$BUILD_DIR/lib/"
rsync -a "$ROOT_DIR/build/locales/" "$BUILD_DIR/locales/"
mkdir -p "$BUILD_DIR/data"

if [[ $TEST_FILE == "" ]]; then
	(cd "$ROOT_DIR" && npm test tests-build/synchronizer.js tests-build/encryption.js tests-build/ArrayUtils.js tests-build/models_Setting.js tests-build/services_InteropService.js)
else
	(cd "$ROOT_DIR" && npm test tests-build/$TEST_FILE.js)
fi