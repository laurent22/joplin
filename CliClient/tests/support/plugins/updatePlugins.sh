#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
TEMP_DIR="$SCRIPT_DIR/_temp"

mkdir -p "$TEMP_DIR"

rm -rf "$TEMP_DIR"
cd "$TEMP_DIR"

yo joplin

rsync -a --delete --exclude "src/" "$TEMP_DIR" "$SCRIPT_DIR/dialog/" 
rsync -a --delete --exclude "src/" "$TEMP_DIR" "$SCRIPT_DIR/events/" 
rsync -a --delete --exclude "src/" "$TEMP_DIR" "$SCRIPT_DIR/json_export/" 
rsync -a --delete --exclude "src/" "$TEMP_DIR" "$SCRIPT_DIR/markdown_plugin/" 
rsync -a --delete --exclude "src/" "$TEMP_DIR" "$SCRIPT_DIR/multi_selection/" 
rsync -a --delete --exclude "src/" "$TEMP_DIR" "$SCRIPT_DIR/register_command/" 
rsync -a --delete --exclude "src/" "$TEMP_DIR" "$SCRIPT_DIR/selected_text/" 
rsync -a --delete --exclude "src/" "$TEMP_DIR" "$SCRIPT_DIR/settings/" 
rsync -a --delete --exclude "src/" "$TEMP_DIR" "$SCRIPT_DIR/toc/" 
rsync -a --delete --exclude "src/" "$TEMP_DIR" "$SCRIPT_DIR/withExternalModules/" 

rm -rf "$TEMP_DIR"
