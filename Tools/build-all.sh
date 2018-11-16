#!/bin/bash
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

"$ROOT_DIR/../CliClient/run.sh" apidoc > "$ROOT_DIR/../readme/api.md" && node "$ROOT_DIR/update-readme-download.js" && node "$ROOT_DIR/build-release-stats.js" && node "$ROOT_DIR/build-website.js" && git add -A && git commit -m "Update website" && git pull && git push