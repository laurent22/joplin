#!/bin/bash
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

cd "$ROOT_DIR/CliClient/node_modules"
rm -rf tkwidgets joplin-turndown joplin-turndown-plugin-gfm
ln -s /mnt/d/Docs/PROGS/Node/tkwidgets/src tkwidgets
ln -s /mnt/d/Temp/turndown-plugin-gfm joplin-turndown-plugin-gfm
ln -s /mnt/d/Temp/turndown joplin-turndown