#!/bin/bash
set -e

"/opt/Qt/5.7/gcc_64/bin/qmake" /home/laurent/src/notes/evernote-import-qt/evernote-import-qt.pro -spec linux-g++ CONFIG+=debug CONFIG+=qml_debug
"/usr/bin/make" qmake_all
make

echo "============================================="
./evernote-import-qt