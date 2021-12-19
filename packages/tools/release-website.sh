#!/bin/bash

set -e

# -----------------------------------------------------------------------------
# Setup environment
# -----------------------------------------------------------------------------

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SCRIPT_NAME=`basename "$0"`
JOPLIN_ROOT_DIR="$SCRIPT_DIR/../.."
JOPLIN_WEBSITE_ROOT_DIR="$JOPLIN_ROOT_DIR/../joplin-website"

# -----------------------------------------------------------------------------
# Update the Markdown files inside the Joplin directory. This is for example
# the download links README.md or the desktop app changelog.
# -----------------------------------------------------------------------------

cd "$JOPLIN_ROOT_DIR"
git pull --rebase
npm install
git reset --hard

npm run updateMarkdownDoc
git add -A

git commit -m "Doc: Updated Markdown files

Auto-updated using $SCRIPT_NAME"

git push

# -----------------------------------------------------------------------------
# Build and deploy the website
# -----------------------------------------------------------------------------

cd "$JOPLIN_WEBSITE_ROOT_DIR"
git pull --rebase

cd "$JOPLIN_ROOT_DIR"
npm run buildWebsite

cd "$JOPLIN_WEBSITE_ROOT_DIR"
git add -A
git commit -m "Updated website"
git push
