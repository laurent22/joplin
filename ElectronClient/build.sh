#!/bin/bash

ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BUILD_DIR="$ROOT_DIR/app"

rsync -a "$ROOT_DIR/../ReactNativeClient/lib/" "$BUILD_DIR/lib/"

cd "$BUILD_DIR"
npm run compile

# for JSX_FILE in "$BUILD_DIR"/gui/*.jsx; do   
# 	JS_FILE="${JSX_FILE::-4}.min.js"
# 	if [ $JSX_FILE -nt $JS_FILE ]; then
# 		echo "Compile $JS_FILE..."
# 		"$ROOT_DIR/app/node_modules/.bin/babel" --presets react "$JSX_FILE" > "$JS_FILE"
# 		if [[ $? != 0 ]]; then
# 			exit 1
# 		fi
# 	fi
# done

# TRANSLATION_BUILD_SCRIPT="$ROOT_DIR/../CliClient/build/build-translation.js"
# if [[ ! -f $TRANSLATION_BUILD_SCRIPT ]]; then
# 	echo "Build the CLI app first ($TRANSLATION_BUILD_SCRIPT missing)"
# 	exit 1
# fi

# node "$TRANSLATION_BUILD_SCRIPT" --silent