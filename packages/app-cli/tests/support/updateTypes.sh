#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
API_SOURCE_DIR="$SCRIPT_DIR/../../../../lib/services/plugins/api"

for DIR in $SCRIPT_DIR/*/ ; do
	[ -d "$DIR/api" ] && rsync -a "$API_SOURCE_DIR/" "$DIR/api/"
done
