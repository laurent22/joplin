#!/bin/bash

ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
MD5="$(cat "$ROOT_DIR/package.json" | md5sum | cut -d' ' -f 1)"
echo -n $MD5 > "$ROOT_DIR/package.json.md5"