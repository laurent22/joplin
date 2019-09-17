 [![Travis Build Status](https://travis-ci.org/laurent22/joplin.svg?branch=master)](https://travis-ci.org/laurent22/joplin) [![Appveyor Build Status](https://ci.appveyor.com/api/projects/status/github/laurent22/joplin?branch=master&passingText=master%20-%20OK&svg=true)](https://ci.appveyor.com/project/laurent22/joplin)

# General information

- All the applications share the same library, which, for historical reasons, is in ReactNativeClient/lib. This library is copied to the relevant directories when building each app.

## macOS dependencies

	brew install yarn node
	echo 'export PATH="/usr/local/opt/gettext/bin:$PATH"' >> ~/.bash_profile
	source ~/.bash_profile

## Linux and Windows (WSL) dependencies

- Install yarn - https://yarnpkg.com/lang/en/docs/install/
- Install node v8.x (check with `node --version`) - https://nodejs.org/en/
- If you get a node-gyp related error you might need to manually install it: `npm install -g node-gyp`

# Building the tools

Before building any of the applications, you need to build the tools and pre-commit hooks:

```
npm install && cd Tools && npm install
```

# Building the Electron application

```
cd ElectronClient/app
rsync --delete -a ../../ReactNativeClient/lib/ lib/
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
cd Tools
npm install
cd ..\ElectronClient\app
xcopy /C /I /H /R /Y /S ..\..\ReactNativeClient\lib lib
npm install
yarn dist
```

If node-gyp does not works (MSBUILD: error MSB3428: Could not load the Visual C++ component "VCBuild.exe"), you might need to install the `windows-build-tools` using `npm install --global windows-build-tools`.

If `yarn dist` fails, it may need administrative rights.

If you get an `error MSB8020: The build tools for v140 cannot be found.` try to run with a different toolset version, eg `npm install --toolset=v141` (See [here](https://github.com/mapbox/node-sqlite3/issues/1124) for more info).

The [building\_win32\_tips on this page](./readme/building_win32_tips.md) might be helpful.

# Building the Mobile application

First you need to setup React Native to build projects with native code. For this, follow the instructions on the [Get Started](https://facebook.github.io/react-native/docs/getting-started.html) tutorial, in the "Building Projects with Native Code" tab.

Then, from `/ReactNativeClient`, run `npm install`, then `react-native run-ios` or `react-native run-android`.

# Building the Terminal application

```
cd CliClient
npm install
./build.sh
rsync --delete -aP ../ReactNativeClient/locales/ build/locales/
```

Run `run.sh` to start the application for testing.