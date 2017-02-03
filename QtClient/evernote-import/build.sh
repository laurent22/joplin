#!/bin/bash

set -e

mkdir -p /cygdrive/d/Web/www/joplin/QtClient/build-evernote-import-qt-Visual_C_32_bits-Debug
cd /cygdrive/d/Web/www/joplin/QtClient/build-evernote-import-qt-Visual_C_32_bits-Debug
rm -rf debug/ release/ Makefile*
export PATH="/cygdrive/c/Program Files (x86)/Microsoft Visual Studio 14.0/VC/bin":$PATH
export PATH=$PATH:"/cygdrive/c/Program Files (x86)/Windows Kits/8.1/bin/x86"
export PATH=$PATH:"/cygdrive/c/Program Files (x86)/Microsoft Visual Studio 14.0/VC/include"
"/cygdrive/c/Qt/5.7/msvc2015/bin/qmake.exe" D:\\Web\\www\\joplin\\QtClient\\evernote-import\\evernote-import-qt.pro -spec win32-msvc2015 "CONFIG+=debug" "CONFIG+=qml_debug"
"/cygdrive/c/Qt/Tools/QtCreator/bin/jom.exe" qmake_all
"/cygdrive/c/Qt/Tools/QtCreator/bin/jom.exe"
rsync -a /cygdrive/d/Web/www/joplin/QtClient/dependencies/dll-debug/ /cygdrive/d/Web/www/joplin/QtClient/build-evernote-import-qt-Visual_C_32_bits-Debug/debug
cd -