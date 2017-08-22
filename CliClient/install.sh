#!/bin/bash
set -e

CLIENT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
npm version patch
$CLIENT_DIR/build.sh
sudo rsync -aP "$CLIENT_DIR/build/" "/usr/lib/node_modules/joplin/"