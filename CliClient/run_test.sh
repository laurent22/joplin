#!/bin/bash
START_DIR="$(pwd)"
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BUILD_DIR="$ROOT_DIR/tests-build"
FILTER="$1"

rsync -a --delete --exclude "lib/" --exclude "locales/" --exclude "node_modules/" "$ROOT_DIR/tests/" "$BUILD_DIR/"
rsync -a --delete "$ROOT_DIR/../ReactNativeClient/lib/" "$BUILD_DIR/lib/"
rsync -a --delete "$ROOT_DIR/../ReactNativeClient/locales/" "$BUILD_DIR/locales/"
mkdir -p "$BUILD_DIR/data"

function finish {
	cd "$START_DIR"
}

trap finish EXIT

cd "$ROOT_DIR"

if [[ $FILTER != "" ]]; then
	npx jasmine --config=tests/support/jasmine.json --filter="$FILTER"
else
	npx jasmine --config=tests/support/jasmine.json
fi
