#!/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

echo "GITHUB_WORKFLOW=$GITHUB_WORKFLOW"
echo "GITHUB_EVENT_NAME=$GITHUB_EVENT_NAME"
echo "GITHUB_REF=$GITHUB_REF"

cd "$SCRIPT_DIR/.."

echo "Node $( node -v )"
echo "Npm $( npm -v )"

npm install

if [ "$GITHUB_EVENT_NAME" == "pull_request" ]; then
	npm run test-ci
	testResult=$?
	if [ $testResult -ne 0 ]; then
		exit $testResult
	fi
fi