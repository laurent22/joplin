@echo off
setlocal
SET mypath=%~dp0
set script_dir=%mypath:~0,-1%
call build.bat
if %errorlevel% neq 0 exit /b %errorlevel%

rem xcopy /C /I /H /R /Y /S /Q D:\Docs\PROGS\Node\joplin-renderer %script_dir%\app\node_modules\joplin-renderer

cd %script_dir%\app
call .\node_modules\.bin\electron.cmd . --env dev --log-level debug --no-welcome --open-dev-tools "$@"
