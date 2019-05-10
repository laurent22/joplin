#!/bin/bash
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

"$ROOT_DIR/../CliClient/run.sh" apidoc > "$ROOT_DIR/../readme/api.md" 
