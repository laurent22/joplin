#!/bin/bash
set -e
CLIENT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

bash "$CLIENT_DIR/build.sh" && node "$CLIENT_DIR/build/main.js" --profile ~/Temp/TestNotes2 --stack-trace-enabled --log-level debug --env dev "$@"

#bash $CLIENT_DIR/build.sh && NODE_PATH="$CLIENT_DIR/build/" node build/main.js --profile ~/Temp/TestNotes2 --stack-trace-enabled --log-level debug --env dev "$@"