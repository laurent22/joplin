@echo off

rem Clear build dir if permission issue:
rem rmdir /S/Q android\app\build

setlocal
node ..\Tools\prepare-android-prod-build.js
cd android
gradlew.bat assembleRelease -PbuildDir=build --console plain