#!/bin/bash

CLIENT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

"$CLIENT_DIR/publish.sh"
npm update -g joplin

# npm version patch
# $CLIENT_DIR/build.sh
# sudo rsync -aP "$CLIENT_DIR/build/" "/usr/lib/node_modules/joplin/"