@echo off
D:
mkdir "D:\Web\www\joplin\QtClient\build-JoplinQtClient-Visual_C_32_bits-Debug\"
cd "D:\Web\www\joplin\QtClient\build-JoplinQtClient-Visual_C_32_bits-Debug\"
"C:\Qt\5.7\msvc2015\bin\qmake.exe" D:\Web\www\joplin\QtClient\JoplinQtClient\JoplinQtClient.pro -spec win32-msvc2015 "CONFIG+=debug" "CONFIG+=qml_debug" "JOP_FRONT_END_GUI=1"
"C:\Qt\Tools\QtCreator\bin\jom.exe" qmake_all
"C:\Qt\Tools\QtCreator\bin\jom.exe"

rem "C:\Qt\5.7\msvc2015\bin\qmake.exe" D:\Web\www\joplin\QtClient\JoplinQtClient\JoplinQtClient.pro -spec win32-msvc2015 "CONFIG+=debug" "CONFIG+=qml_debug"
rem "C:\Qt\Tools\QtCreator\bin\jom.exe" qmake_all
rem "C:\Qt\Tools\QtCreator\bin\jom.exe"