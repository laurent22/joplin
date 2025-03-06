#!/bin/bash

# This is a convenient way to build and test a plugin demo.
# It could be used to develop plugins too.

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
TEMP_PATH=~/src/plugin-tests
NEED_COMPILING=1
PLUGIN_PATH=~/src/plugin-yesyoucan

if [[ $NEED_COMPILING == 1 ]]; then
	mkdir -p "$TEMP_PATH"
	PLUGIN_NAME=$(echo "$PLUGIN_PATH" | awk -F/ '{print $NF}')
	TEMP_PLUGIN_PATH="$TEMP_PATH/$PLUGIN_NAME" 

	echo "Copying from: $PLUGIN_PATH"
	echo "To: $TEMP_PLUGIN_PATH"

	rsync -a --exclude "cache/" --exclude "node_modules" --delete "$PLUGIN_PATH/" "$TEMP_PLUGIN_PATH/" 

	cd "$TEMP_PLUGIN_PATH/"
	NODE_OPTIONS=--openssl-legacy-provider npm install
	
	cd "$SCRIPT_DIR"
	yarn start --dev-plugins "$TEMP_PLUGIN_PATH"
else
	yarn start --dev-plugins "$PLUGIN_PATH"
fi

# Add eg "--profile $HOME/.config/joplindev-desktop-1" to test with a different profile