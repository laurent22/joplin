#!/bin/bash

set -e

mkdir -p /cygdrive/d/Web/www/joplin/QtClient/build-JoplinQtClient-Visual_C_32_bits-Debug
cd /cygdrive/d/Web/www/joplin/QtClient/build-JoplinQtClient-Visual_C_32_bits-Debug
rm -rf debug/ release/ Makefile*
export PATH="/cygdrive/c/Program Files (x86)/Microsoft Visual Studio 14.0/VC/bin":$PATH
export PATH=$PATH:"/cygdrive/c/Program Files (x86)/Windows Kits/8.1/bin/x86"
export PATH=$PATH:"/cygdrive/c/Program Files (x86)/Microsoft Visual Studio 14.0/VC/include"
"/cygdrive/c/Qt/5.7/msvc2015/bin/qmake.exe" D:\\Web\\www\\joplin\\QtClient\\JoplinQtClient\\JoplinQtClient.pro -spec win32-msvc2015 "CONFIG+=debug" "CONFIG+=qml_debug" "JOP_FRONT_END_GUI=1"
"/cygdrive/c/Qt/Tools/QtCreator/bin/jom.exe" qmake_all
"/cygdrive/c/Qt/Tools/QtCreator/bin/jom.exe"
rsync -a /cygdrive/d/Web/www/joplin/QtClient/dependencies/dll-debug/ /cygdrive/d/Web/www/joplin/QtClient/build-JoplinQtClient-Visual_C_32_bits-Debug/debug
cd -



# BUILD_DIR=/home/laurent/src/notes/QtClient/build-JoplinQtClient-Desktop_Qt_5_7_1_GCC_64bit-Debug
# mkdir -p "$BUILD_DIR"
# cd "$BUILD_DIR"
# /opt/Qt/5.7/gcc_64/bin/qmake /home/laurent/src/notes/QtClient/JoplinQtClient/JoplinQtClient.pro -spec linux-g++ CONFIG+=debug CONFIG+=qml_debug JOP_FRONT_END_CLI=1
# /usr/bin/make qmake_all
# /usr/bin/make