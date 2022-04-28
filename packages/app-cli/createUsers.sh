#!/bin/bash

# Start the server with:
#
# JOPLIN_IS_TESTING=1 yarn run start-dev

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# curl --data '{"action": "clearDatabase"}' -H 'Content-Type: application/json' http://api.joplincloud.local:22300/api/debug

# SMALL

# curl --data '{"action": "createTestUsers", "count": 400, "fromNum": 1}' -H 'Content-Type: application/json' http://api.joplincloud.local:22300/api/debug

NUM=398
while [ "$NUM" -lt 400 ]; do
	NUM=$(( NUM + 1 ))

	echo "User $NUM"

	CMD_FILE="$SCRIPT_DIR/createUsers-$NUM.txt"
	PROFILE_DIR=~/.config/joplindev-testing-$NUM
	USER_EMAIL="user$NUM@example.com"

	rm -rf "$CMD_FILE" "$PROFILE_DIR"
	touch "$CMD_FILE"

	FLAG_FOLDER_COUNT=100
	FLAG_NOTE_COUNT=1000
	FLAG_TAG_COUNT=20

	if [ "$NUM" -gt 300 ]; then
		FLAG_FOLDER_COUNT=2000
		FLAG_NOTE_COUNT=10000
		FLAG_TAG_COUNT=200
	fi

	if [ "$NUM" -gt 399 ]; then
		FLAG_FOLDER_COUNT=10000
		FLAG_NOTE_COUNT=150000
		FLAG_TAG_COUNT=2000
	fi

	echo "testing populate --silent --folder-count $FLAG_FOLDER_COUNT --note-count $FLAG_NOTE_COUNT --tag-count $FLAG_TAG_COUNT" >> "$CMD_FILE"
	echo "config keychain.supported 0" >> "$CMD_FILE" 
	echo "config sync.target 10" >> "$CMD_FILE" 
	echo "config sync.10.username $USER_EMAIL" >> "$CMD_FILE" 
	echo "config sync.10.password 111111" >> "$CMD_FILE"
	echo "sync" >> "$CMD_FILE"

	yarn start --profile "$PROFILE_DIR" batch "$CMD_FILE"
done
