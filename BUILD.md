 [![Travis Build Status](https://travis-ci.org/laurent22/joplin.svg?branch=master)](https://travis-ci.org/laurent22/joplin) [![Appveyor Build Status](https://ci.appveyor.com/api/projects/status/github/laurent22/joplin?branch=master&passingText=master%20-%20OK&svg=true)](https://ci.appveyor.com/project/laurent22/joplin)

# General information

- All the applications share the same library, which, for historical reasons, is in ReactNativeClient/lib. This library is copied to the relevant directories when building each app.
- In general, most of the backend (anything to do with the database, synchronisation, data import or export, etc.) is shared across all the apps, so when making a change please consider how it will affect all the apps.

# TypeScript

Most of the application is written in JavaScript, however new classes and files should generally be written in [TypeScript](https://www.typescriptlang.org/). Even if you don't write TypeScript code, you will need to build the existing .ts and .tsx files. This is done from the root of the project, by running `npm run tsc`.

If you are modifying TypeScript code, the best is to have the compiler watch for changes from a terminal. To do so, run `npm run tsc-watch`.

All TypeScript files are generated next to the .ts or .tsx file. So for example, if there's a file "lib/MyClass.ts", there will be a generated "lib/MyClass.js" next to it. If you create a new TypeScript file, make sure you add the generated .js file to .gitignore. It is implemented that way as it requires minimal changes to integrate TypeScript in the existing JavaScript code base.

## macOS dependencies

	brew install yarn node
	echo 'export PATH="/usr/local/opt/gettext/bin:$PATH"' >> ~/.bash_profile
	source ~/.bash_profile

## Linux and Windows (WSL) dependencies

- Install yarn - https://yarnpkg.com/lang/en/docs/install/
- Install node v10.x (check with `node --version`) - https://nodejs.org/en/
- If you get a node-gyp related error you might need to manually install it: `npm install -g node-gyp`

# Building the tools

Before building any of the applications, you need to build the tools and pre-commit hooks:

```
npm install && cd Tools && npm install
```

# Building the Electron application

```
rsync --delete -a ReactNativeClient/lib/ ElectronClient/app/lib/
npm run tsc
cd ElectronClient/app
npm install
yarn dist
```

If there's an error `while loading shared libraries: libgconf-2.so.4: cannot open shared object file: No such file or directory`, run `sudo apt-get install libgconf-2-4`

If you get a node-gyp related error you might need to manually install it: `npm install -g node-gyp`.

If you get the error `libtool: unrecognized option '-static'`, follow the instructions [in this post](https://stackoverflow.com/a/38552393/561309) to use the correct libtool version.

That will create the executable file in the `dist` directory.

From `/ElectronClient` you can also run `run.sh` to run the app for testing.

## Building Electron application on Windows

```
xcopy /C /I /H /R /Y /S ReactNativeClient\lib ElectronClient\app\lib
npm run tsc
cd ElectronClient\app
npm install
yarn dist
```

If node-gyp does not works (MSBUILD: error MSB3428: Could not load the Visual C++ component "VCBuild.exe"), you might need to install the `windows-build-tools` using `npm install --global windows-build-tools`.

If `yarn dist` fails, it may need administrative rights.

If you get an `error MSB8020: The build tools for v140 cannot be found.` try to run with a different toolset version, eg `npm install --toolset=v141` (See [here](https://github.com/mapbox/node-sqlite3/issues/1124) for more info).

The [building\_win32\_tips on this page](./readme/building_win32_tips.md) might be helpful.

# Building the Mobile application

First you need to setup React Native to build projects with native code. For this, follow the instructions on the [Get Started](https://facebook.github.io/react-native/docs/getting-started.html) tutorial, in the "React Native CLI Quickstart" tab.

Then:

```
npm run tsc
cd ReactNativeClient
npm install
react-native run-ios
# Or: react-native run-android
```

# Building the Terminal application

```
cd CliClient
npm install
./build.sh
```

Run `run.sh` to start the application for testing.
