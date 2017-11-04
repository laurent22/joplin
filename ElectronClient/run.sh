#!/bin/bash
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$ROOT_DIR"
./build.sh
cd "$ROOT_DIR/app"
node_modules/.bin/electron . --env dev --log-level debug "$@"