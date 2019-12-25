#!/bin/bash
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# TODO: When the apidoc command fails, it copy the failure in api.md, but shouldn't be doing that
"$ROOT_DIR/../CliClient/run.sh" apidoc > "$ROOT_DIR/../readme/api.md" && node "$ROOT_DIR/update-readme-download.js" && node "$ROOT_DIR/build-release-stats.js" && node "$ROOT_DIR/build-welcome.js" && node "$ROOT_DIR/build-website.js" && git add -A && git commit -m "Update website" && git pull && git push