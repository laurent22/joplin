#!/bin/bash
CLIENT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

rm -f "$CLIENT_DIR/spec-build/src"
ln -s "$CLIENT_DIR/build/src" "$CLIENT_DIR/spec-build"

npm build && NODE_PATH="$CLIENT_DIR/spec-build/" npm test spec-build/synchronizer.js