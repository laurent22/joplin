#!/bin/bash
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
yarn upgrade
npm version patch
#$SCRIPT_DIR/update-package-md5.sh
touch "$SCRIPT_DIR/app/main.js"
bash $SCRIPT_DIR/build.sh
cp "$SCRIPT_DIR/package.json" build/
cp "$SCRIPT_DIR/../README.md" build/
cd "$SCRIPT_DIR/build"
npm publish