#!/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
CLI_DIR="$SCRIPT_DIR/../app-cli"
LIB_DIR="$SCRIPT_DIR/../lib"

cd "$LIB_DIR"
yarn run generatePluginTypes

cd "$SCRIPT_DIR"
rsync -a --delete "$LIB_DIR/plugin_types/lib/services/plugins/api/" "$SCRIPT_DIR/generators/app/templates/api/"
cp "$LIB_DIR/services/plugins/api/types.ts" "$SCRIPT_DIR/generators/app/templates/api/"
cp "$LIB_DIR/services/plugins/api/noteListType.ts" "$SCRIPT_DIR/generators/app/templates/api/"
cp "$SCRIPT_DIR/generators/app/templates/api_index.ts" "$SCRIPT_DIR/generators/app/templates/api/index.ts"
rm -f "$SCRIPT_DIR/generators/app/templates/api/types.d.ts"
