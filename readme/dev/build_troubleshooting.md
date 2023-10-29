# Build troubleshooting

## Desktop application

### On Windows

If `yarn dist` fails, it may need administrative rights.

If you get an `error MSB8020: The build tools for v140 cannot be found.` try to run with a different toolset version, eg `npm install --toolset=v141` (See [here](https://github.com/mapbox/node-sqlite3/issues/1124) for more info). You may also try to install `npm --vs2015 install --global windows-build-tools` (the --vs2015 flag is to get toolkit "v140", which is what is used by default).

There are various errors that can occur from an improper build environment (such as MSBUILD: error MSB3428). It is recommended to install `windows-build-tools` with the command `npm install --global windows-build-tools` (elevation required) and then using these two commands to set the environmental variables to the proper values:

```batch
call "C:\Program Files (x86)\Microsoft Visual Studio\2017\BuildTools\VC\Auxiliary\Build\vcvarsamd64_x86.bat" 
set "PATH=C:\Program Files\nodejs;%PATH%"
```

### On Linux and macOS

If there's an error `while loading shared libraries: libgconf-2.so.4: cannot open shared object file: No such file or directory`, run `sudo apt-get install libgconf-2-4`

If you get a node-gyp related error, you might need to manually install it: `npm install -g node-gyp`.

If you get unexpected `npm` dependency errors on a fresh git pull, try `npm run clean`

If `npm i` gives you a fatal error like the following:
```
node-pre-gyp WARN Tried to download(403): https://mapbox-node-binary.s3.amazonaws.com/sqlite3/v5.0.1/napi-v6-linux-x64.tar.gz 
node-pre-gyp WARN Pre-built binaries not found for sqlite3@5.0.1 and node@14.15.4 (node-v83 ABI, glibc) (falling back to source compile with node-gyp)
/bin/sh: 1: python: not found
```
Try `sudo apt install python` (or the `apt` equivalent for your operating system) and then run `npm i` again.

If you get the error `libtool: unrecognized option '-static'`, follow the instructions [in this post](https://stackoverflow.com/a/38552393/561309) to use the correct libtool version.

### Other issues

> The application window doesn't open or is white

This is an indication that there's an early initialisation error. Try this:

- In ElectronAppWrapper, set `debugEarlyBugs` to `true`. This will force the window to show up and should open the console next to it, which should display any error.
- In more rare cases, an already open instance of Joplin can create strange low-level bugs that will display no error but will result in this white window. A non-dev instance of Joplin, or a dev instance that wasn't properly closed might cause this. So make sure you close everything and try again. Perhaps even other Electron apps running (Skype, Slack, etc.) could cause this?
- Also try to delete node_modules and rebuild.
- If all else fails, switch your computer off and on again, to make sure you start clean.

> How to work on the app from Windows?

**You should not use WSL at all** because this is a GUI app that lives outside of WSL, and the WSL layer can cause all kind of very hard to debug issues. It can also lock files in node_modules that cannot be unlocked when the app crashes. (You need to restart your computer.) Likewise, don't run the TypeScript watch command from WSL.

So everything should be done from a Windows Command prompt or Windows PowerShell running as Administrator. All build and start commands are designed to work cross-platform, including on Windows.

## Mobile application

### iOS

If there is an error `/joplin/packages/app-mobile/ios/Pods/Target Support Files/Pods-Joplin/Pods-Joplin.debug.xcconfig: unable to open file (in target "Joplin" in project "Joplin") (in target 'Joplin' from project 'Joplin')` run the following commands:

    cd ios
    pod deintegrate
    pod install
