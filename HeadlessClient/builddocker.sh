#!/bin/bash
set -e
CLIENT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

bash "$CLIENT_DIR/build.sh" && cd build && npm run appimage && mv dist .. && cd .. && docker build .

# bash $CLIENT_DIR/build.sh && NODE_PATH="$CLIENT_DIR/build/" node build/main.js --profile ~/.config/joplin --stack-trace-enabled --log-level debug "$@"
