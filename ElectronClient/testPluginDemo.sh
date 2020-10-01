#!/bin/bash
PLUGIN_PATH=/home/laurent/source/joplin/CliClient/tests/support/plugins/json_export
npm i --prefix="$PLUGIN_PATH" && npm start -- --dev-plugins "$PLUGIN_PATH"