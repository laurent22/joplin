#!/bin/bash
CLIENT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

rm -f "$CLIENT_DIR/app/lib"
ln -s "$CLIENT_DIR/../lib" "$CLIENT_DIR/app"
npm run build