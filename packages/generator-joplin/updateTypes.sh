#!/bin/bash

git pull

if [[ -n $(git status --porcelain) ]]; then
	echo "There are changes in the repo"
	exit 1
fi

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
CLI_DIR="$SCRIPT_DIR/../app-cli"
LIB_DIR="$SCRIPT_DIR/../lib"

cd "$LIB_DIR"
npm run generatePluginTypes

cd "$SCRIPT_DIR"
rsync -a --delete "$LIB_DIR/plugin_types/services/plugins/api/" "$SCRIPT_DIR/generators/app/templates/api/"
cp "$LIB_DIR/services/plugins/api/types.ts" "$SCRIPT_DIR/generators/app/templates/api/"
cp "$SCRIPT_DIR/generators/app/templates/api_index.ts" "$SCRIPT_DIR/generators/app/templates/api/index.ts"
rm -f "$SCRIPT_DIR/generators/app/templates/api/types.d.ts"

npm link

"$CLI_DIR/tests/support/plugins/updatePlugins.sh"

git add -A
git c -m "Plugins: Updated types"
git push
