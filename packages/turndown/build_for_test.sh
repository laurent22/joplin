#!/bin/bash
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT_DIR="$SCRIPT_DIR/../.."

npm run build
cd $ROOT_DIR/packages/app-cli && npm run test -- HtmlToMd