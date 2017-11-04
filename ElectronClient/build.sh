#!/bin/bash

ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BUILD_DIR="$ROOT_DIR/build"

rsync -a app/ $BUILD_DIR/
rsync -a "$ROOT_DIR/../ReactNativeClient/lib/" "$BUILD_DIR/lib/"

TRANSLATION_BUILD_SCRIPT="$ROOT_DIR/../CliClient/build/build-translation.js"
if [[ ! -f $TRANSLATION_BUILD_SCRIPT ]]; then
	echo "Build the CLI app first ($TRANSLATION_BUILD_SCRIPT missing)"
	exit 1
fi

node "$TRANSLATION_BUILD_SCRIPT" --silent