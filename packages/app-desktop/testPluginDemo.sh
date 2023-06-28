#!/bin/bash

# This is a convenient way to build and test a plugin demo.
# It could be used to develop plugins too.

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
TEMP_PATH=~/src/plugin-tests
PLUGIN_PATH=~/src/joplin/packages/app-cli/tests/support/plugins/user_data

mkdir -p "$TEMP_PATH"
PLUGIN_NAME=$(echo "$PLUGIN_PATH" | awk -F/ '{print $NF}')
TEMP_PLUGIN_PATH="$TEMP_PATH/$PLUGIN_NAME" 

rsync -a --delete "$PLUGIN_PATH/" "$TEMP_PLUGIN_PATH/" 

npm install --prefix="$TEMP_PLUGIN_PATH" && yarn start --dev-plugins "$TEMP_PLUGIN_PATH"

# Add eg "--profile $HOME/.config/joplindev-desktop-1" to test with a different profile