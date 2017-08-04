#/bin/bash
CLIENT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
NODE_PATH="$CLIENT_DIR/build" node "$CLIENT_DIR/build/build-translation.js" --silent