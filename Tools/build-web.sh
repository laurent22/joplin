#!/bin/bash
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

node "$ROOT_DIR/build-website.js" 
#&& git add -A && git commit -m "Update website" && git pull && git push
