#!/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

cd "$SCRIPT_DIR/.."

npm run test-ci
testResult=$?
if [ $testResult -ne 0 ]; then
	exit $testResult
fi
