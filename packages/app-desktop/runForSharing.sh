#!/bin/bash

# Setup the sync parameters for user X and create a few folders and notes to
# allow sharing. Also calls the API to create the test users and clear the data.

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
ROOT_DIR="$SCRIPT_DIR/../.."

if [ "$1" == "" ]; then
	echo "User number is required"
	exit 1
fi

USER_NUM=$1

USER_EMAIL="user$USER_NUM@example.com"
PROFILE_DIR=~/.config/joplindev-desktop-$USER_NUM
rm -rf "$PROFILE_DIR"

cd "$ROOT_DIR/packages/app-cli"

npm start -- --profile "$PROFILE_DIR" config keychain.supported 0
npm start -- --profile "$PROFILE_DIR" config sync.target 9
npm start -- --profile "$PROFILE_DIR" config sync.9.path http://localhost:22300
npm start -- --profile "$PROFILE_DIR" config sync.9.username $USER_EMAIL
npm start -- --profile "$PROFILE_DIR" config sync.9.password 123456

if [ "$1" == "1" ]; then
	curl --data '{"action": "createTestUsers"}' http://localhost:22300/api/debug

	npm start -- --profile "$PROFILE_DIR" mkbook "shared"
	npm start -- --profile "$PROFILE_DIR" mkbook "other"
	npm start -- --profile "$PROFILE_DIR" use "shared"
	npm start -- --profile "$PROFILE_DIR" mknote "note 1"
fi

cd "$ROOT_DIR/packages/app-desktop"

npm start -- --profile "$PROFILE_DIR"
