#!/bin/bash

# This is a convenient way to build and test a plugin demo.
# It could be used to develop plugins too.

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PLUGIN_PATH=~/src/joplin/packages/app-cli/tests/support/plugins/user_data
npm install --prefix="$PLUGIN_PATH" && yarn start --dev-plugins "$PLUGIN_PATH"