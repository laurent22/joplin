# General information

- All the applications share the same library, which, for historical reasons, is in ReactNativeClient/lib. This library is copied to the relevant directories when builing each app.
- The translations are built by running CliClient/build-translation.sh. You normally don't need to run this if you haven't updated the translation since the compiled files are on the repository.

## macOS dependencies

	brew install yarn node
	echo 'export PATH="/usr/local/opt/gettext/bin:$PATH"' >> ~/.bash_profile
	source ~/.bash_profile
     
If you get a node-gyp related error you might need to manually install it: `npm install -g node-gyp`

## Linux and Windows (WSL) dependencies

- Install yarn - https://yarnpkg.com/lang/en/docs/install/
- Install node v8.x (check with `node --version`) - https://nodejs.org/en/
- If you get a node-gyp related error you might need to manually install it: `npm install -g node-gyp`

# Building the Electron application

```
cd ElectronClient/app
rsync -a ../../ReactNativeClient/lib/ lib/
npm install
yarn dist
```

If there's an error `while loading shared libraries: libgconf-2.so.4: cannot open shared object file: No such file or directory`, run `sudo apt-get install libgconf-2-4`

That will create the executable file in the `dist` directory.

From `/ElectronClient` you can also run `run.sh` to run the app for testing.

# Building the Mobile application

First you need to to setup React Native to build projects with native code. For this, follow the instructions on the [Get Started](https://facebook.github.io/react-native/docs/getting-started.html) tutorial, in the "Building Projects with Native Code" tab.

Then, from `/ReactNativeClient`, run `npm install`, then `react-native run-ios` or `react-native run-android`.

# Building the Terminal application

```
cd CliClient
npm install
./build.sh
rsync -aP ../ReactNativeClient/locales/ build/locales/
```

Run `run.sh` to start the application for testing.