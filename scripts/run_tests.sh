#!/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

cd "$SCRIPT_DIR/.."

echo "Node $( node -v )"
echo "Npm $( npm -v )"

npm install

npm run test-ci
testResult=$?
if [ $testResult -ne 0 ]; then
	exit $testResult
fi
