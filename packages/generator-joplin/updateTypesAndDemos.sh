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
TEST_PLUGINS_DIR="$SCRIPT_DIR/../app-cli/tests/support/plugins"

./updateTypes.sh

API_SOURCE_DIR="$SCRIPT_DIR/generators/app/templates/api"

for DIR in $TEST_PLUGINS_DIR/*/ ; do
	if [ -d "$DIR/api" ]; then
		echo "Updating $DIR/api/..."
		rsync -a "$API_SOURCE_DIR/" "$DIR/api/"
	fi
	exit
done


# npm link

# "$CLI_DIR/tests/support/plugins/updatePlugins.sh"

# git add -A
# git c -m "Plugins: Updated types"
# git push
