#!/bin/bash
CLIENT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

rm "$CLIENT_DIR/app/src"
ln -s "$CLIENT_DIR/../ReactNativeClient/src" "$CLIENT_DIR/app"

npm run build && NODE_PATH="$CLIENT_DIR/build/" node build/import-enex.js