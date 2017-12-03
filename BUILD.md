# General information

- All the applications share the same library, which, for historical reasons, is in ReactNativeClient/lib. This library is copied to the relevant directories when builing each app.
- The translations are built by running CliClient/build-translation.sh. For this reasons, it's generally better to get the CLI app to build first so that everything is setup correctly.
- Note: building translations is no longer required to run the apps, so you can ignore all the below requirements about gettext.

## macOS dependencies

    brew install yarn node xgettext
    echo 'export PATH="/usr/local/opt/gettext/bin:$PATH"' >> ~/.bash_profile
    source ~/.bash_profile

## Linux and Windows dependencies

- Install yarn - https://yarnpkg.com/lang/en/docs/install/
- Install node v8.x (check with `node --version`) - https://nodejs.org/en/

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

From `/ReactNativeClient`, run `npm install`, then `react-native run-ios` or `react-native run-android`.

# Building the Terminal application

From `/CliClient`, run `npm install` then run `run.sh`. If you get an error about `xgettext`, comment out the command `node build-translation.js --silent` in build.sh
