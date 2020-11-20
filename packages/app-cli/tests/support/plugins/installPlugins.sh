#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# cd "$SCRIPT_DIR/jpl_test/" && npm i && \
# cd "$SCRIPT_DIR/codemirror_content_script/" && npm i && \
# cd "$SCRIPT_DIR/content_script/" && npm i && \
# cd "$SCRIPT_DIR/dialog/" && npm i && \
# cd "$SCRIPT_DIR/editor_context_menu/" && npm i && \
# cd "$SCRIPT_DIR/events/" && npm i && \
# cd "$SCRIPT_DIR/json_export/" && npm i && \
# cd "$SCRIPT_DIR/menu/" && npm i && \
# cd "$SCRIPT_DIR/multi_selection/" && npm i && \
# cd "$SCRIPT_DIR/register_command/" && npm i && \
cd "$SCRIPT_DIR/selected_text/" && npm i && \
cd "$SCRIPT_DIR/settings/" && npm i && \
cd "$SCRIPT_DIR/toc/" && npm i && \
cd "$SCRIPT_DIR/withExternalModules/" && npm i
