#!/bin/bash
set -e

"/cygdrive/c/Qt/5.7/msvc2015/bin/qmake.exe" "D:\\Web\\www\\joplin\\QtClient\\evernote-import\\evernote-import-qt.pro" -spec win32-msvc2015 "CONFIG+=debug" "CONFIG+=qml_debug"
"/cygdrive/c/Qt/Tools/QtCreator/bin/jom.exe" qmake_all
"/cygdrive/c/Qt/Tools/QtCreator/bin/jom.exe"

# "/opt/Qt/5.7/gcc_64/bin/qmake" /home/laurent/src/notes/evernote-import-qt/evernote-import-qt.pro -spec linux-g++ CONFIG+=debug CONFIG+=qml_debug
# "/usr/bin/make" qmake_all
# make

# echo "============================================="
# ./evernote-import-qt