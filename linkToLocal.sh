#!/bin/bash
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

cd "$ROOT_DIR/CliClient/node_modules"
rm -rf tkwidgets joplin-turndown joplin-turndown-plugin-gfm
ln -s /mnt/d/Docs/PROGS/Node/tkwidgets/src tkwidgets
ln -s /mnt/d/Docs/PROGS/Node/joplin-turndown-plugin-gfm joplin-turndown-plugin-gfm
ln -s /mnt/d/Docs/PROGS/Node/joplin-turndown joplin-turndown

rsync -a --delete --exclude 'node_modules/' /mnt/d/Docs/PROGS/Node/joplin-turndown-plugin-gfm/ /var/www/joplin/ElectronClient/node_modules/joplin-turndown-plugin-gfm/
rsync -a --delete --exclude 'node_modules/' /mnt/d/Docs/PROGS/Node/joplin-turndown/ /var/www/joplin/ElectronClient/node_modules/joplin-turndown/