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

JOPLIN_GITHUB_OAUTH_TOKEN=$JOPLIN_GITHUB_OAUTH_TOKEN yarn updateMarkdownDoc

# Automatically update certain forum posts
yarn updateNews $DISCOURSE_API_KEY $DISCOURSE_USERNAME
yarn postPreReleasesToForum $DISCOURSE_API_KEY $DISCOURSE_USERNAME

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
CROWDIN_PERSONAL_TOKEN="$CROWDIN_PERSONAL_TOKEN" yarn crowdinDownload
yarn buildWebsite

cd "$JOPLIN_WEBSITE_ROOT_DIR"

# Copy and update the plugin website.
# 
# For security, the plugin website is built in a separate job without access to SSH
# keys. This file contains the built output of the other job.
# 
# We apply this to the existing plugin website to prevent the changes from being overwritten.
BUILT_PLUGIN_WEBSITE_FILE="$JOPLIN_ROOT_DIR/../plugin-website.tar.gz"

if [ -f "$BUILT_PLUGIN_WEBSITE_FILE" ]; then
	cd "$JOPLIN_WEBSITE_ROOT_DIR/docs"

	mkdir -p plugins
	cd plugins

	tar -xzvf "$BUILT_PLUGIN_WEBSITE_FILE"
else
	echo "Not updating plugin website -- release ($BUILT_PLUGIN_WEBSITE_FILE) not present"
	exit 1
fi

# Note: Do not commit changes to the website -- website updates are handled by the CI
# script.

