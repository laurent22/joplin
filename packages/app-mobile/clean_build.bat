@echo off
rmdir /s/q android\app\build
rmdir /s/q android\build
rmdir /s/q android\.gradle
rmdir /s/q node_modules
npm install
npm run start