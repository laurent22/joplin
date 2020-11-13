#!/bin/bash

# This is a convenient way to build and test a plugin demo.
# It could be used to develop plugins too.

PLUGIN_PATH=/home/laurent/source/joplin/packages/app-cli/tests/support/plugins/register_command
npm i --prefix="$PLUGIN_PATH" && npm start -- --dev-plugins "$PLUGIN_PATH"