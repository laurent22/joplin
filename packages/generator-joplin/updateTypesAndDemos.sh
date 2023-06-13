#!/bin/bash

set -e

# git pull

# if [[ -n $(git status --porcelain) ]]; then
# 	echo "There are changes in the repo"
# 	exit 1
# fi

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
CLI_DIR="$SCRIPT_DIR/../app-cli"
LIB_DIR="$SCRIPT_DIR/../lib"

./updateTypes.sh

npm link

"$CLI_DIR/tests/support/plugins/updatePlugins.sh"

git add -A
git c -m "Plugins: Updated types"
git push
