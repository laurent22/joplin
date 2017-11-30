# Electron application

- Install yarn - https://yarnpkg.com/lang/en/docs/install/
- Install node v8.x (check with `node --version`) - https://nodejs.org/en/
- Then run these commands:

```
cd ElectronClient/app
rsync -a ../../ReactNativeClient/lib/ lib/
npm install
yarn dist
```

If there's an error `while loading shared libraries: libgconf-2.so.4: cannot open shared object file: No such file or directory`, run `sudo apt-get install libgconf-2-4`

That will create the executable file in the `dist` directory.

From `/ElectronClient` you can also run `run.sh` to run the app for testing.

# Mobile application

From `/ReactNativeClient`, run `npm install`, then `react-native run-ios` or `react-native run-android`.

# Terminal application

From `/CliClient`, run `npm install` then run `run.sh`. If you get an error about `xgettext`, comment out the command `node build-translation.js --silent` in build.sh
