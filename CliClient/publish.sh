#!/bin/bash
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
npm version patch
bash $SCRIPT_DIR/build.sh
cp "$SCRIPT_DIR/package.json" build/
cd "$SCRIPT_DIR/build"
npm publish