#!/bin/bash

# =============================================================================
# Setup environment variables
# =============================================================================

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
ROOT_DIR="$SCRIPT_DIR/../.."

IS_PULL_REQUEST=0
IS_DEV_BRANCH=0
IS_LINUX=0
IS_MACOS=0

if [ "$GITHUB_EVENT_NAME" == "pull_request" ]; then
	IS_PULL_REQUEST=1
fi

if [ "$GITHUB_REF" == "refs/heads/dev" ]; then
	IS_DEV_BRANCH=1
fi

if [ "$RUNNER_OS" == "Linux" ]; then
	IS_LINUX=1
	IS_MACOS=0
else
	IS_LINUX=0
	IS_MACOS=1
fi

# =============================================================================
# Print environment
# =============================================================================

echo "GITHUB_WORKFLOW=$GITHUB_WORKFLOW"
echo "GITHUB_EVENT_NAME=$GITHUB_EVENT_NAME"
echo "GITHUB_REF=$GITHUB_REF"
echo "RUNNER_OS=$RUNNER_OS"
echo "GIT_TAG_NAME=$GIT_TAG_NAME"
echo "BUILD_SEQUENCIAL=$BUILD_SEQUENCIAL"
echo "SERVER_REPOSITORY=$SERVER_REPOSITORY"
echo "SERVER_TAG_PREFIX=$SERVER_TAG_PREFIX"

echo "IS_CONTINUOUS_INTEGRATION=$IS_CONTINUOUS_INTEGRATION"
echo "IS_PULL_REQUEST=$IS_PULL_REQUEST"
echo "IS_DEV_BRANCH=$IS_DEV_BRANCH"
echo "IS_LINUX=$IS_LINUX"
echo "IS_MACOS=$IS_MACOS"

echo "Node $( node -v )"
echo "Npm $( npm -v )"
echo "Yarn $( yarn -v )"

# =============================================================================
# Install packages
# =============================================================================

cd "$ROOT_DIR"
yarn install
testResult=$?
if [ $testResult -ne 0 ]; then
	echo "Yarn installation failed. Search for 'exit code 1' in the log for more information."
	exit $testResult
fi

# =============================================================================
# Run test units. Only do it for pull requests and dev branch because we don't
# want it to randomly fail when trying to create a desktop release.
# =============================================================================

if [ "$IS_PULL_REQUEST" == "1" ] || [ "$IS_DEV_BRANCH" = "1" ]; then
	echo "Step: Running tests..."

	# On Linux, we run the Joplin Server tests using PostgreSQL
	if [ "$IS_LINUX" == "1" ]; then
		echo "Running Joplin Server tests using PostgreSQL..."
		sudo docker-compose --file docker-compose.db-dev.yml up -d
		export JOPLIN_TESTS_SERVER_DB=pg
	else
		echo "Running Joplin Server tests using SQLite..."
	fi

	# Need this because we're getting this error:
	#
	# @joplin/lib: FATAL ERROR: Ineffective mark-compacts near heap limit
	# Allocation failed - JavaScript heap out of memory
	#
	# https://stackoverflow.com/questions/38558989
	export NODE_OPTIONS="--max-old-space-size=4096"
	yarn run test-ci
	testResult=$?
	if [ $testResult -ne 0 ]; then
		exit $testResult
	fi
fi

# =============================================================================
# Run linter for pull requests only. We also don't want this to make the desktop
# release randomly fail.
# =============================================================================

if [ "$IS_PULL_REQUEST" == "1" ] || [ "$IS_DEV_BRANCH" = "1" ]; then
	echo "Step: Running linter..."

	yarn run linter-ci ./
	testResult=$?
	if [ $testResult -ne 0 ]; then
		exit $testResult
	fi

	yarn run packageJsonLint
	testResult=$?
	if [ $testResult -ne 0 ]; then
		exit $testResult
	fi
fi

# =============================================================================
# Validate translations - this is needed as some users manually edit .po files
# (and often make mistakes) instead of using a proper tool like poedit. Doing it
# for Linux only is sufficient.
# =============================================================================

if [ "$IS_PULL_REQUEST" == "1" ]; then
	if [ "$IS_LINUX" == "1" ]; then
		echo "Step: Validating translations..."

		node packages/tools/validate-translation.js
		testResult=$?
		if [ $testResult -ne 0 ]; then
			exit $testResult
		fi
	fi
fi

# =============================================================================
# Check that we didn't lose any string due to gettext not being able to parse
# newly modified or added scripts. This is convenient to quickly view on GitHub
# what commit may have broken translation building.
# =============================================================================

if [ "$IS_PULL_REQUEST" == "1" ] || [ "$IS_DEV_BRANCH" = "1" ]; then
	if [ "$IS_LINUX" == "1" ]; then
		echo "Step: Checking for lost translation strings..."

		xgettext --version

		node packages/tools/build-translation.js --missing-strings-check-only
		testResult=$?
		if [ $testResult -ne 0 ]; then
			exit $testResult
		fi
	fi
fi

# =============================================================================
# Find out if we should run the build or not. Electron-builder gets stuck when
# building PRs so we disable it in this case. The Linux build should provide
# enough info if the app builds or not.
# https://github.com/electron-userland/electron-builder/issues/4263
# =============================================================================

if [ "$IS_PULL_REQUEST" == "1" ]; then
	if [ "$IS_MACOS" == "1" ]; then
		echo "Step: Not building Electron app"
		exit 0
	fi
fi

# =============================================================================
# Build the Electron app or Docker image depending on the current tag.
#
# If the current tag is a desktop release tag (starts with "v", such as
# "v1.4.7"), we build and publish to GitHub. Otherwise we only build but don't
# publish to GitHub. It helps finding out any issue in pull requests and dev
# branch.
# =============================================================================

cd "$ROOT_DIR/packages/app-desktop"

if [[ $GIT_TAG_NAME = v* ]]; then
	echo "Step: Building and publishing desktop application..."
	cd "$ROOT_DIR/packages/tools"
	node bundleDefaultPlugins.js
	cd "$ROOT_DIR/packages/app-desktop"
	USE_HARD_LINKS=false yarn run dist
elif [[ $IS_LINUX = 1 ]] && [[ $GIT_TAG_NAME = $SERVER_TAG_PREFIX-* ]]; then
	echo "Step: Building Docker Image..."
	cd "$ROOT_DIR"
	yarn run buildServerDocker --tag-name $GIT_TAG_NAME --push-images --repository $SERVER_REPOSITORY
else
	echo "Step: Building but *not* publishing desktop application..."
	USE_HARD_LINKS=false yarn run dist --publish=never
fi
