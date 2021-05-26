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
RESET_ALL=$2
PROFILE_DIR=~/.config/joplindev-desktop-$USER_NUM

if [ "$RESET_ALL" == "1" ]; then
	CMD_FILE="$SCRIPT_DIR/runForSharingCommands-$USER_NUM.txt"
	rm -f "$CMD_FILE"

	USER_EMAIL="user$USER_NUM@example.com"
	rm -rf "$PROFILE_DIR"

	echo "config keychain.supported 0" >> "$CMD_FILE" 
	echo "config sync.target 9" >> "$CMD_FILE" 
	echo "config sync.9.path http://api-joplincloud.local:22300" >> "$CMD_FILE" 
	echo "config sync.9.username $USER_EMAIL" >> "$CMD_FILE" 
	echo "config sync.9.password 123456" >> "$CMD_FILE" 

	if [ "$USER_NUM" == "1" ]; then
		curl --data '{"action": "createTestUsers"}' -H 'Content-Type: application/json' http://api-joplincloud.local:22300/api/debug

		echo 'mkbook "shared"' >> "$CMD_FILE"
		echo 'mkbook "other"' >> "$CMD_FILE"
		echo 'use "shared"' >> "$CMD_FILE"
		echo 'mknote "note 1"' >> "$CMD_FILE"
		echo 'mknote "note 2"' >> "$CMD_FILE"
	fi

	cd "$ROOT_DIR/packages/app-cli"
	npm start -- --profile "$PROFILE_DIR" batch "$CMD_FILE"
fi

cd "$ROOT_DIR/packages/app-desktop"
npm start -- --profile "$PROFILE_DIR"
