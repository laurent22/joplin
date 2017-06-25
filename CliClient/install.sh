#!/bin/bash
CLIENT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
bash $CLIENT_DIR/build.sh
cp "$CLIENT_DIR/package.json" build/
cp "$CLIENT_DIR/../lib/package.json" build/lib
cp "$CLIENT_DIR/app/main.sh" build/
cd "$CLIENT_DIR/build"
sudo npm install -g --save
cd -