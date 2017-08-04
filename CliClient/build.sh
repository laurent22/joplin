#!/bin/bash
set -e

CLIENT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

mkdir -p "$CLIENT_DIR/build"
rm -f "$CLIENT_DIR/app/lib"
ln -s "$CLIENT_DIR/../ReactNativeClient/lib" "$CLIENT_DIR/app"
cp "$CLIENT_DIR/package.json" "$CLIENT_DIR/build"
cp "$CLIENT_DIR/app/autocompletion_template.txt" "$CLIENT_DIR/build"

npm run build

chmod 755 "$CLIENT_DIR/build/main_launcher.js"
#yarn run build

#NODE_PATH="$CLIENT_DIR/build" node "$CLIENT_DIR/build/build-translation.js" --silent