#!/bin/bash

# Setup the sync parameters for user X and create a few folders and notes to
# allow sharing. Also calls the API to create the test users and clear the data.
# This script was setup for the desktop app but can now also be used to test the
# CLI using the `clix` users.

# ----------------------------------------------------------------------------------
# For example, to setup a user for sharing, and another as recipient with E2EE
# enabled:
# ----------------------------------------------------------------------------------

# ./runForTesting.sh 1 createUsers,createData,reset,e2ee,sync && ./runForTesting.sh 2 reset,e2ee,sync && ./runForTesting.sh 1

# ----------------------------------------------------------------------------------
# First user has E2EE, but second one doesn't:
# ----------------------------------------------------------------------------------

# ./runForTesting.sh 1 createUsers,createData,reset,e2ee,sync && ./runForTesting.sh 2 reset,sync && ./runForTesting.sh 1

# ----------------------------------------------------------------------------------
# Without E2EE:
# ----------------------------------------------------------------------------------

# ./runForTesting.sh 1 createUsers,createData,reset,sync && ./runForTesting.sh 2 reset,sync && ./runForTesting.sh 1

# ./runForTesting.sh 1 createUsers,createData,reset,sync && ./runForTesting.sh 2 reset,sync && ./runForTesting.sh 3 reset,sync && ./runForTesting.sh 1

# ----------------------------------------------------------------------------------
# To create two client profiles, in sync, both used by the same user:
# ----------------------------------------------------------------------------------

# ./runForTesting.sh 1 createUsers,createData,reset,sync && ./runForTesting.sh 1a reset,sync && ./runForTesting.sh 1
# ./runForTesting.sh 1a

# ----------------------------------------------------------------------------------
# Team accounts:
# ----------------------------------------------------------------------------------

# ./runForTesting.sh 1 createTeams,createData,resetTeam,sync && ./runForTesting.sh 2 resetTeam,sync && ./runForTesting.sh 1

# ----------------------------------------------------------------------------------
# User 1 shares a folder with user 2
# ----------------------------------------------------------------------------------

# ./runForTesting.sh 1 createUsers,createData,reset,shareWithUser2,sync && ./runForTesting.sh 2 reset,sync && ./runForTesting.sh 1

# ----------------------------------------------------------------------------------
# Testing the CLI app with commands:
# ----------------------------------------------------------------------------------

# ./runForTesting.sh cli1 createUsers,createData,reset,sync
# ./runForTesting.sh cli1 -- import /path/to/file.jex

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
ROOT_DIR="$SCRIPT_DIR/../.."

if [ "$1" == "" ]; then
	echo "User number is required"
	exit 1
fi

USER_NUM=$1
USER_PROFILE_NUM=$USER_NUM
IS_DESKTOP=1

if [ "$USER_NUM" = "1a" ]; then
	USER_NUM=1
	USER_PROFILE_NUM=1a
fi

if [ "$USER_NUM" = "1b" ]; then
	USER_NUM=1
	USER_PROFILE_NUM=1b
fi

if [ "$USER_NUM" = "2a" ]; then
	USER_NUM=2
	USER_PROFILE_NUM=2a
fi

if [ "$USER_NUM" = "2b" ]; then
	USER_NUM=2
	USER_PROFILE_NUM=2b
fi

if [ "$USER_NUM" = "cli1" ]; then
	USER_NUM=1
	USER_PROFILE_NUM=1
	IS_DESKTOP=0
fi

if [ "$USER_NUM" = "cli1a" ]; then
	USER_NUM=1
	USER_PROFILE_NUM=1a
	IS_DESKTOP=0
fi

COMMANDS=($(echo $2 | tr "," "\n"))
PROFILE_DIR=~/.config/joplindev-desktop-$USER_PROFILE_NUM
SYNC_TARGET=10

CMD_FILE="$SCRIPT_DIR/runForTestingCommands-$USER_PROFILE_NUM.txt"
rm -f "$CMD_FILE"
touch "$CMD_FILE"

echo "Using sync target: $SYNC_TARGET"

for CMD in "${COMMANDS[@]}"
do
    if [[ $CMD == "createUsers" ]]; then

		curl --data '{"action": "createTestUsers"}' -H 'Content-Type: application/json' http://api.joplincloud.local:22300/api/debug

	elif [[ $CMD == "createUserDeletions" ]]; then

		curl --data '{"action": "createUserDeletions"}' -H 'Content-Type: application/json' http://api.joplincloud.local:22300/api/debug

	elif [[ $CMD == "createTeams" ]]; then

		curl --data '{"action": "createTeams"}' -H 'Content-Type: application/json' http://api.joplincloud.local:22300/api/debug

	elif [[ $CMD == "createData" ]]; then
		
		echo 'mkbook "shared"' >> "$CMD_FILE"
		echo 'mkbook "other"' >> "$CMD_FILE"
		echo 'use "shared"' >> "$CMD_FILE"
		echo 'mknote "note 1"' >> "$CMD_FILE"
		echo 'mknote "note 2"' >> "$CMD_FILE"
		echo 'mkbook --parent "shared" "sub"' >> "$CMD_FILE"
		echo 'use "sub"' >> "$CMD_FILE"
		echo 'mknote "note 3"' >> "$CMD_FILE"
	
	elif [[ $CMD == "shareWithUser2" ]]; then
	
		echo 'share add "shared" user2@example.com' >> "$CMD_FILE"
	
	elif [[ $CMD == "reset" ]]; then
	
		USER_EMAIL="user$USER_NUM@example.com"
		rm -rf "$PROFILE_DIR"

		echo "config keychain.supported 0" >> "$CMD_FILE" 
		echo "config sync.target $SYNC_TARGET" >> "$CMD_FILE" 
		echo "config sync.$SYNC_TARGET.username $USER_EMAIL" >> "$CMD_FILE" 
		echo "config sync.$SYNC_TARGET.password 111111" >> "$CMD_FILE"

		if [[ $SYNC_TARGET = 9 ]]; then
			echo "config sync.$SYNC_TARGET.path http://api.joplincloud.local:22300" >> "$CMD_FILE" 
			echo "config sync.$SYNC_TARGET.userContentPath http://joplinusercontent.local:22300" >> "$CMD_FILE" 
		fi
	
	elif [[ $CMD == "resetTeam" ]]; then
	
		USER_EMAIL="teamuser1-$USER_NUM@example.com"
		rm -rf "$PROFILE_DIR"

		echo "config keychain.supported 0" >> "$CMD_FILE" 
		echo "config sync.target $SYNC_TARGET" >> "$CMD_FILE" 
		echo "config sync.$SYNC_TARGET.username $USER_EMAIL" >> "$CMD_FILE" 
		echo "config sync.$SYNC_TARGET.password 111111" >> "$CMD_FILE"

	elif [[ $CMD == "e2ee" ]]; then
	
		echo "e2ee enable --password 111111" >> "$CMD_FILE" 

	elif [[ $CMD == "sync" ]]; then
	
		echo "sync --use-lock 0" >> "$CMD_FILE" 

	elif [[ $CMD == "--" ]]; then

		break

	else
	
		echo "Unknown command: $CMD"
		exit 1
	
	fi
done

cd "$ROOT_DIR/packages/app-cli"
yarn start --profile "$PROFILE_DIR" batch "$CMD_FILE"

if [[ $CMD != "--" ]]; then
	if [[ $COMMANDS != "" ]]; then
		exit 0
	fi
fi

if [ "$IS_DESKTOP" = "1" ]; then
	cd "$ROOT_DIR/packages/app-desktop"
	yarn start --profile "$PROFILE_DIR" --alt-instance-id $USER_NUM
else
	cd "$ROOT_DIR/packages/app-cli"
	if [[ $CMD == "--" ]]; then
		shift
		shift
		yarn start --profile "$PROFILE_DIR" "$@"
	else
		yarn start --profile "$PROFILE_DIR"
	fi	
fi