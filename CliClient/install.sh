#!/bin/bash

CLIENT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

"$CLIENT_DIR/publish.sh"
npm install -g joplin