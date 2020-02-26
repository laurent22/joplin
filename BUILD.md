 [![Travis Build Status](https://travis-ci.org/laurent22/joplin.svg?branch=master)](https://travis-ci.org/laurent22/joplin) [![Appveyor Build Status](https://ci.appveyor.com/api/projects/status/github/laurent22/joplin?branch=master&passingText=master%20-%20OK&svg=true)](https://ci.appveyor.com/project/laurent22/joplin)

# Building the applications

Note that all the applications share the same library, which, for historical reasons, is in `ReactNativeClient/lib`. This library is copied to the relevant directories when building each app.

## Required dependencies

- Install yarn - https://yarnpkg.com/lang/en/docs/install/
- Install node - https://nodejs.org/en/

## Building

Before doing anything else, from the root of the project, run:

	npm install

Then you can test the various applications:

## Testing the desktop application

	cd ElectronClient
	npm run start

If you'd like to auto-reload the app on changes rather than having to quit and restart it manually each time, you can use [watchman-make](https://facebook.github.io/watchman/docs/watchman-make.html):

```sh
cd ElectronClient
watchman-make -p '**/*.js' '**/*.jsx' --run "npm run start"
```

It still requires you to quit the application each time you want it to rebuild, but at least you don't have to re-run `"npm run start"` each time. Here's what the workflow loop looks like in practice:

1. Edit and save files in your text editor.
2. Switch to the Electron app and <kbd>cmd</kbd>+<kbd>Q</kbd> to quit it.
3. `watchman` immediately restarts the app for you (whereas usually you'd have to switch back to the terminal, type `"npm run start"`, and hit enter).

## Testing the Terminal application

	cd CliClient
	npm run start

## Testing the Mobile application

First you need to setup React Native to build projects with native code. For this, follow the instructions on the [Get Started](https://facebook.github.io/react-native/docs/getting-started.html) tutorial, in the "React Native CLI Quickstart" tab.

Then:

	cd ReactNativeClient
	npm run start-android
	# Or: npm run start-ios

To run the iOS application, it might be easier to open the file `ios/Joplin.xcworkspace` on XCode and run the app from there.

Normally the bundler should start automatically with the application. If it doesn't run `npm run start`.

## Building the clipper

	cd Clipper/popup
	npm install
	npm run watch # To watch for changes

To test the extension please refer to the relevant pages for each browser: [Firefox](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_first_WebExtension#Trying_it_out) / [Chrome](https://developer.chrome.com/extensions/faq#faq-dev-01). Please note that the extension in dev mode will only connect to a dev instance of the desktop app (and vice-versa).

## Watching files

To make changes to the application, you'll need to rebuild any TypeScript file you've changed, and rebuild the lib. The simplest way to do all this is to watch for changes from the root of the project. Simply run this command, and it should take care of the rest:

	npm run watch

Running `npm run build` would have the same effect, but without watching.

## Running an application with additional parameters

You can specify additional parameters when running the desktop or CLI application. To do so, add `--` to the `npm run start` command, followed by your flags. For example:

	npm run start -- --profile ~/MyTestProfile

## TypeScript

Most of the application is written in JavaScript, however new classes and files should generally be written in [TypeScript](https://www.typescriptlang.org/). All TypeScript files are generated next to the .ts or .tsx file. So for example, if there's a file "lib/MyClass.ts", there will be a generated "lib/MyClass.js" next to it. It is implemented that way as it requires minimal changes to integrate TypeScript in the existing JavaScript code base.

# Troubleshooting desktop application

## On Linux and macOS

If there's an error `while loading shared libraries: libgconf-2.so.4: cannot open shared object file: No such file or directory`, run `sudo apt-get install libgconf-2-4`

If you get a node-gyp related error, you might need to manually install it: `npm install -g node-gyp`.

If you get the error `libtool: unrecognized option '-static'`, follow the instructions [in this post](https://stackoverflow.com/a/38552393/561309) to use the correct libtool version.

## On Windows

If node-gyp does not work (MSBUILD: error MSB3428: Could not load the Visual C++ component "VCBuild.exe"), you might need to install `windows-build-tools` using `npm install --global windows-build-tools`.

If `yarn dist` fails, it may need administrative rights.

If you get an `error MSB8020: The build tools for v140 cannot be found.` try to run with a different toolset version, eg `npm install --toolset=v141` (See [here](https://github.com/mapbox/node-sqlite3/issues/1124) for more info).

## Other issues

> The application window doesn't open or is white

This is an indication that there's an early initialisation error. Try this:

- In ElectronAppWrapper, set `debugEarlyBugs` to `true`. This will force the window to show up and should open the console next to it, which should display any error.
- In more rare cases, an already open instance of Joplin can create strange low-level bugs that will display no error but will result in this white window. A non-dev instance of Joplin, or a dev instance that wasn't properly closed might cause this. So make sure you close everything and try again. Perhaps even other Electron apps running (Skype, Slack, etc.) could cause this?
- Also try to delete node_modules and rebuild.
- If all else fails, switch your computer off and on again, to make sure you start clean.

> How to work on the app from Windows?

**You should not use WSL at all** because this is a GUI app that lives outside of WSL, and the WSL layer can cause all kind of very hard to debug issues. It can also lock files in node_modules that cannot be unlocked when the app crashes. (You need to restart your computer.) Likewise, don't run the TypeScript watch command from WSL.

So everything should be done from a Windows Command prompt or Windows PowerShell running as Administrator. All build and start commands are designed to work cross-platform, including on Windows.
