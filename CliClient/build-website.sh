#!/bin/bash
set -e
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
"$ROOT_DIR/build.sh" && NODE_PATH="$ROOT_DIR/build" node "$ROOT_DIR/build/build-website.js"