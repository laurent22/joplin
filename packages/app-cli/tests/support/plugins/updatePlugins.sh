#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

cd "$SCRIPT_DIR/jpl_test/" && yo joplin --update --skip-install --silent
sed -i /*.jpl/d .gitignore

cd "$SCRIPT_DIR/codemirror_content_script/" && yo joplin --update --skip-install --silent
cd "$SCRIPT_DIR/content_script/" && yo joplin --update --skip-install --silent
cd "$SCRIPT_DIR/dialog/" && yo joplin --update --skip-install --silent
cd "$SCRIPT_DIR/editor_context_menu/" && yo joplin --update --skip-install --silent
cd "$SCRIPT_DIR/events/" && yo joplin --update --skip-install --silent
cd "$SCRIPT_DIR/json_export/" && yo joplin --update --skip-install --silent
cd "$SCRIPT_DIR/menu/" && yo joplin --update --skip-install --silent
cd "$SCRIPT_DIR/multi_selection/" && yo joplin --update --skip-install --silent
cd "$SCRIPT_DIR/register_command/" && yo joplin --update --skip-install --silent
cd "$SCRIPT_DIR/selected_text/" && yo joplin --update --skip-install --silent
cd "$SCRIPT_DIR/settings/" && yo joplin --update --skip-install --silent
cd "$SCRIPT_DIR/toc/" && yo joplin --update --skip-install --silent
cd "$SCRIPT_DIR/withExternalModules/" && yo joplin --update --skip-install --silent
cd "$SCRIPT_DIR/post_messages/" && yo joplin --update --skip-install --silent
cd "$SCRIPT_DIR/nativeModule/" && yo joplin --update --skip-install --silent
cd "$SCRIPT_DIR/external_assets/" && yo joplin --update --skip-install --silent
cd "$SCRIPT_DIR/user_data/" && yo joplin --update --skip-install --silent
