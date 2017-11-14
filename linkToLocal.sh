#!/bin/bash
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

cd "$ROOT_DIR/CliClient/node_modules"
rm -rf tkwidgets
ln -s /mnt/d/Docs/PROGS/Node/tkwidgets/src tkwidgets