#!/bin/bash

set -e

# ------------------------------------------------------------------------------
# Setup environment
# ------------------------------------------------------------------------------

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SCRIPT_NAME=`basename "$0"`
JOPLIN_ROOT_DIR="$SCRIPT_DIR/../.."
JOPLIN_WEBSITE_ROOT_DIR="$JOPLIN_ROOT_DIR/../joplin-website"

echo "IS_CONTINUOUS_INTEGRATION=$IS_CONTINUOUS_INTEGRATION"
echo "GIT_USER_NAME=$GIT_USER_NAME"

if [[ "$IS_CONTINUOUS_INTEGRATION" == "1" ]]; then
	echo "Running on CI - setting up Git username and email"
	git config --global user.email "$GIT_USER_EMAIL"
	git config --global user.name "$GIT_USER_NAME"
else
	echo "*Not* running on CI - using the global Git username and email"
fi

# ------------------------------------------------------------------------------
# Update the Markdown files inside the Joplin directory. This is for example the
# download links README.md or the desktop app changelog.
# ------------------------------------------------------------------------------

cd "$JOPLIN_ROOT_DIR"

# Will fail if there's any local change in the repo, which is what we want
git checkout dev
git pull --rebase

yarn install

# Historically, that was to clean npm's package-lock mess, but it should no
# longer be necessary for Yarn. Leaving it anyway since we don't want anything
# to change after installation.
git reset --hard

JOPLIN_GITHUB_OAUTH_TOKEN=$JOPLIN_GITHUB_OAUTH_TOKEN yarn run updateMarkdownDoc

# Automatically update certain forum posts
yarn run updateNews $DISCOURSE_API_KEY $DISCOURSE_USERNAME
yarn run postPreReleasesToForum $DISCOURSE_API_KEY $DISCOURSE_USERNAME

# We commit and push the change. It will be a noop if nothing was actually
# changed

git add -A

git commit -m "Doc: Auto-update documentation

Auto-updated using $SCRIPT_NAME" || true

git pull --rebase
git push

# ------------------------------------------------------------------------------
# Build and deploy the website
# ------------------------------------------------------------------------------

cd "$JOPLIN_WEBSITE_ROOT_DIR"
git checkout master
git pull --rebase

cd "$JOPLIN_ROOT_DIR"
yarn run buildWebsite

cd "$JOPLIN_WEBSITE_ROOT_DIR"
git add -A
git commit -m "Updated website

Auto-updated using $SCRIPT_NAME" || true

git pull --rebase
git push
