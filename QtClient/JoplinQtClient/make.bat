SET PATH=%PATH%;"C:\Program Files (x86)\Microsoft Visual Studio 14.0\VC\bin"

cd "D:\Web\www\joplin\QtClient\build-evernote-import-qt-Visual_C_32_bites-Debug"
if %errorlevel% neq 0 exit /b %errorlevel%

"C:\Qt\5.7\msvc2015\bin\qmake.exe" D:\Web\www\joplin\QtClient\evernote-import\evernote-import-qt.pro -spec win32-msvc2015 "CONFIG+=debug" "CONFIG+=qml_debug"
if %errorlevel% neq 0 exit /b %errorlevel%

"C:\Qt\Tools\QtCreator\bin\jom.exe" qmake_all
if %errorlevel% neq 0 exit /b %errorlevel%

"C:\Qt\Tools\QtCreator\bin\jom.exe" 
if %errorlevel% neq 0 exit /b %errorlevel%



/cygdrive/c/Qt/Tools/QtCreator/bin/jom.exe