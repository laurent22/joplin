#!/bin/bash
CLIENT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

rm -f "$CLIENT_DIR/tests-build/lib"
mkdir -p "$CLIENT_DIR/tests-build/data"
ln -s "$CLIENT_DIR/build/lib" "$CLIENT_DIR/tests-build"

npm run build && NODE_PATH="$CLIENT_DIR/tests-build/" npm test tests-build/synchronizer.js tests-build/base-model.js

#npm run build && NODE_PATH="$CLIENT_DIR/tests-build/" npm test tests-build/base-model.js
#npm run build && NODE_PATH="$CLIENT_DIR/tests-build/" npm test tests-build/models/folder.js