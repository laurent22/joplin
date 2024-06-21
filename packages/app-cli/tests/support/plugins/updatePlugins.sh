#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

update_plugin() {
	echo "Updating $1..."
	cd "$SCRIPT_DIR/$1" && yo joplin --update --skip-install --silent
	echo "Done."
}

update_plugin jpl_test
sed -i /*.jpl/d .gitignore

PLUGINS_TO_UPDATE=(
	"clipboard"
	"codemirror6"
	"codemirror_content_script"
	"content_script"
	"dialog"
	"editor_context_menu"
	"events"
	"external_assets"
	"imaging"
	"json_export"
	"load_css"
	"menu"
	"multi_selection"
	"nativeModule"
	"note_list_renderer"
	"post_messages"
	"register_command"
	"selected_text"
	"settings"
	"toc"
	"user_data"
	"withExternalModules"
)

for PLUGIN in ${PLUGINS_TO_UPDATE[@]}; do
	update_plugin "$PLUGIN"
done