@echo off
setlocal
SET mypath=%~dp0
set script_dir=%mypath:~0,-1%

xcopy /C /I /H /R /Y /S /Q %script_dir%\..\ReactNativeClient\lib %script_dir%\app\lib
REM if %errorlevel% neq 0 exit /b %errorlevel%

rem Note that TypeScript must be installed globally for this to work
REM cd %script_dir%\..
REM call tsc
REM if %errorlevel% neq 0 exit /b %errorlevel%

cd %script_dir%\app
call npm run compile
REM if %errorlevel% neq 0 exit /b %errorlevel%
