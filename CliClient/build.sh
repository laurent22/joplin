#!/bin/bash
CLIENT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

mkdir -p "$CLIENT_DIR/build"
rm -f "$CLIENT_DIR/app/lib"
ln -s "$CLIENT_DIR/../ReactNativeClient/lib" "$CLIENT_DIR/app"
cp "$CLIENT_DIR/package.json" "$CLIENT_DIR/build"

# Always keep this as the last line so that the exit
# code of build.sh is the same as the build command:
npm run build