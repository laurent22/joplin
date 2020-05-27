 [![Travis Build Status](https://travis-ci.org/laurent22/joplin.svg?branch=master)](https://travis-ci.org/laurent22/joplin) [![Appveyor Build Status](https://ci.appveyor.com/api/projects/status/github/laurent22/joplin?branch=master&passingText=master%20-%20OK&svg=true)](https://ci.appveyor.com/project/laurent22/joplin)

# Building the applications

Note that all the applications share the same library, which, for historical reasons, is in `ReactNativeClient/lib`. This library is copied to the relevant directories when building each app.

## Required dependencies

- Install yarn - https://yarnpkg.com/lang/en/docs/install/
- Install node 10+ - https://nodejs.org/en/
- macOS, Linux: Install rsync - https://nodejs.org/en/
- macOS: Install Cocoapods - `brew install cocoapods`
- Windows: Install Windows Build Tools - `npm install -g windows-build-tools`

## Building

Before doing anything else, from the root of the project, run:

	npm install

Then you can test the various applications:

## Testing the desktop application

	cd ElectronClient
	npm start

## Testing the Terminal application

	cd CliClient
	npm start

## Testing the Mobile application

First you need to setup React Native to build projects with native code. For this, follow the instructions on the [Get Started](https://facebook.github.io/react-native/docs/getting-started.html) tutorial, in the "React Native CLI Quickstart" tab.

Then:

	cd ReactNativeClient
	npm run start-android
	# Or: npm run start-ios

To run the iOS application, it might be easier to open the file `ios/Joplin.xcworkspace` on XCode and run the app from there.

Normally the bundler should start automatically with the application. If it doesn't, run `npm start`.

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

You can specify additional parameters when running the desktop or CLI application. To do so, add `--` to the `npm start` command, followed by your flags. For example:

	npm start -- --profile ~/MyTestProfile

## TypeScript

Most of the application is written in JavaScript, however new classes and files should generally be written in [TypeScript](https://www.typescriptlang.org/). All TypeScript files are generated next to the .ts or .tsx file. So for example, if there's a file "lib/MyClass.ts", there will be a generated "lib/MyClass.js" next to it. It is implemented that way as it requires minimal changes to integrate TypeScript in the existing JavaScript code base.

## Hot reload

If you'd like to auto-reload the desktop app on changes rather than having to quit and restart it manually each time, you can use [watchman-make](https://facebook.github.io/watchman/docs/watchman-make.html):

```sh
cd ElectronClient
watchman-make -p '**/*.js' '**/*.jsx' --run "npm start"
```

It still requires you to quit the application each time you want it to rebuild, but at least you don't have to re-run `"npm start"` each time. Here's what the workflow loop looks like in practice:

1. Edit and save files in your text editor.
2. Switch to the Electron app and <kbd>cmd</kbd>+<kbd>Q</kbd> to quit it.
3. `watchman` immediately restarts the app for you (whereas usually you'd have to switch back to the terminal, type `"npm start"`, and hit enter).

# Troubleshooting

Please read for the [Build Troubleshooting Document](https://github.com/laurent22/joplin/blob/master/readme/build_troubleshooting.md) for various tips on how to get the build working.