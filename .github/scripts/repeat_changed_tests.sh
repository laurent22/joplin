#!/bin/bash
# Run the test files changed by a pull request several times, to catch flaky
# tests before they are merged.
#
# Usage: repeat_changed_tests.sh <base_ref> [repeat_count]

set -u

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
ROOT_DIR="$SCRIPT_DIR/../.."

BASE_REF="${1:-}"
REPEAT_COUNT="${2:-5}"

cd "$ROOT_DIR"

# The CI checkout is shallow, so the base branch is not present locally. Always
# fetch it rather than using a local branch of the same name, which may be
# outdated.
if git fetch --no-tags --depth=1 origin "$BASE_REF" 2> /dev/null; then
	BASE_REF=FETCH_HEAD
elif ! git rev-parse --verify --quiet "$BASE_REF" > /dev/null; then
	echo "Could not resolve base ref \"$BASE_REF\""
	exit 1
fi

testFiles=$(git diff --name-only --diff-filter=d "$BASE_REF" HEAD | grep -E '^packages/[^/]+/.*\.(test|spec)\.(ts|tsx|js|jsx)$' || true)

if [ -z "$testFiles" ]; then
	echo "No test files were changed - skipping flaky test detection"
	exit 0
fi

echo "Changed test files:"
echo "$testFiles" | sed 's/^/  /'

# Each package has its own Jest config and must be run from its own directory.
packages=$(echo "$testFiles" | sed -E 's|^packages/([^/]+)/.*|\1|' | sort -u)

for package in $packages; do
	packageDir="$ROOT_DIR/packages/$package"

	# Some packages have test files but no test runner configured.
	if ! node -e "const s = require('$packageDir/package.json').scripts; process.exit(s && s['test-ci'] ? 0 : 1)" 2> /dev/null; then
		echo "Package $package has no test-ci script - skipping"
		continue
	fi

	# See packages/app-mobile/tools/runTestsConditionally.js
	if [ "$package" == "app-mobile" ] && [ "$RUNNER_OS" == "macOS" ]; then
		echo "Skipping app-mobile tests on macOS"
		continue
	fi

	# Paths must be relative to the package for `--runTestsByPath`.
	packageTestFiles=$(echo "$testFiles" | grep -E "^packages/$package/" | sed -E "s|^packages/$package/||")

	cd "$packageDir"
	for i in $(seq 1 "$REPEAT_COUNT"); do
		echo "Running $package tests - attempt $i/$REPEAT_COUNT..."

		# shellcheck disable=SC2086
		if ! yarn jest --runTestsByPath $packageTestFiles --forceExit; then
			echo "Tests failed on attempt $i/$REPEAT_COUNT in $package - they are flaky if earlier attempts passed"
			exit 1
		fi
	done
	cd "$ROOT_DIR"
done
