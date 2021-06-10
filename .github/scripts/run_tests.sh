#!/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

IS_PULL_REQUEST=0
IS_DEV_BRANCH=0

if [ "$GITHUB_EVENT_NAME" == "pull_request" ]; then
	IS_PULL_REQUEST=1
fi

if [ "$GITHUB_REF" == "refs/heads/dev" ]; then
	IS_DEV_BRANCH=1
fi

echo "GITHUB_WORKFLOW=$GITHUB_WORKFLOW"
echo "GITHUB_EVENT_NAME=$GITHUB_EVENT_NAME"
echo "GITHUB_REF=$GITHUB_REF"
echo "IS_PULL_REQUEST=$IS_PULL_REQUEST"
echo "IS_DEV_BRANCH=$IS_DEV_BRANCH"
echo "RUNNER_OS=$RUNNER_OS"

cd "$SCRIPT_DIR/.."

echo "Node $( node -v )"
echo "Npm $( npm -v )"

npm install

# Run test units. Only do it for pull requests and dev branch because we don't
# want it to randomly fail when trying to create a desktop release.

if [ "$IS_PULL_REQUEST" == "1" ] || [ "$IS_DEV_BRANCH" = "1" ]; then
	npm run test-ci
	testResult=$?
	if [ $testResult -ne 0 ]; then
		exit $testResult
	fi
fi

# Run linter for pull requests only. We also don't want this to make the desktop
# release randomly fail.

if [ "$IS_PULL_REQUEST" != "1" ]; then
	npm run linter-ci ./
	testResult=$?
	if [ $testResult -ne 0 ]; then
		exit $testResult
	fi
fi

# Validate translations - this is needed as some users manually
# edit .po files (and often make mistakes) instead of using a proper
# tool like poedit. Doing it for Linux only is sufficient.
# if [ "$IS_PULL_REQUEST" == "1" ]; then
# 	if [ "$TRAVIS_OS_NAME" != "osx" ]; then
# 		node packages/tools/validate-translation.js
# 		testResult=$?
# 		if [ $testResult -ne 0 ]; then
# 			exit $testResult
# 		fi
# 	fi
# fi