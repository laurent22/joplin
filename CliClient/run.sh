#!/bin/bash
CLIENT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
bash $CLIENT_DIR/build.sh
npm run build && NODE_PATH="$CLIENT_DIR/build/" node build/main.js