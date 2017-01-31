#!/bin/bash

BUILD_DIR=/home/laurent/src/notes/QtClient/build-JoplinQtClient-Desktop_Qt_5_7_1_GCC_64bit-Debug
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"
/opt/Qt/5.7/gcc_64/bin/qmake /home/laurent/src/notes/QtClient/JoplinQtClient/JoplinQtClient.pro -spec linux-g++ CONFIG+=debug CONFIG+=qml_debug JOP_FRONT_END_CLI=1
/usr/bin/make qmake_all
/usr/bin/make