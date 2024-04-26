# Building the applications

The Joplin source code is hosted on a [monorepo](https://en.wikipedia.org/wiki/Monorepo) and is managed using Yarn workspaces (as well as Lerna for publishing the packages).

The list of the main sub-packages is below:

Package name | Description
--- | ---
app-cli | The CLI application
app-clipper | The web clipper
app-desktop | The desktop application
app-mobile | The mobile application
lib | The core library, shared by all applications. It deals with things like synchronisation, encryption, import/export, database and pretty much all the app business logic
renderer | The Joplin Markdown and HTML renderer
tools | Tools used to build the apps and other tasks

There are also a few forks of existing packages under the "fork-*" name.

## Required dependencies

- Install Node 18+. On Windows, also install the build tools - https://nodejs.org/en/
  - [Enable Yarn](https://yarnpkg.com/getting-started/install): `corepack enable`
- macOS: Install Cocoapods - `brew install cocoapods`. Apple Silicon [may require libvips](https://github.com/laurent22/joplin/pull/5966#issuecomment-1007158597) - `brew install vips`.
- Linux: Install dependencies - `sudo apt install build-essential libnss3 libsecret-1-dev python rsync libgbm-dev libatk-bridge2.0-0 libgtk-3.0 libasound2`

## Building

Make sure the path to the project directory does not contain spaces or the build may fail.

Before doing anything else, from the root of the project, run:

	yarn install

Then you can test the various applications:

## Testing the desktop application

	cd packages/app-desktop
	yarn start

You can also run it under WSL 2. To do so, [follow these instructions](https://www.beekeeperstudio.io/blog/building-electron-windows-ubuntu-wsl2) to setup your environment.

## Testing the Terminal application

	cd packages/app-cli
	yarn start

## Testing the Mobile application

First you need to setup React Native to build projects with native code. For this, follow the instructions in the [Setting up the development environment](https://reactnative.dev/docs/environment-setup) tutorial, in the "React Native CLI Quickstart" tab.

### Android

Run this to build and install the app on the emulator:

	cd packages/app-mobile/android
	./gradlew installDebug # or gradlew.bat installDebug on Windows

### iOS

On iOS, you need to run `pod install`, which is not done automatically during build time (since it takes too long). You have two options:

- Build the app using `RUN_POD_INSTALL=1 yarn install`
- Or manually run `pod install` from `packages/app-mobile/ios`

Once this is done, open the file `ios/Joplin.xcworkspace` on XCode and run the app from there.

Normally the **bundler** should start automatically with the application. If it doesn't, run `yarn start` from `packages/app-mobile`.

## Building the clipper

	cd packages/app-clipper/popup
	npm run watch # To watch for changes

To test the extension please refer to the relevant pages for each browser: [Firefox](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_first_WebExtension#Trying_it_out) / [Chrome](https://developer.chrome.com/docs/extensions/mv3/getstarted/). Please note that the extension in dev mode will only connect to a dev instance of the desktop app (and vice-versa).

## Watching files

To make changes to the application, you'll need to rebuild any TypeScript file you've changed. The simplest way to do this is to watch for changes from the root of the project. Simply run this command, and it should take care of the rest:

	yarn watch

Running `yarn tsc` would have the same effect, but without watching.

## Running an application with additional parameters

You can specify additional parameters when running the desktop or CLI application. To do so, add `--` to the `yarn start` command, followed by your flags. For example:

	yarn start --debug

## TypeScript

The application was originally written in JavaScript, however it has slowly been migrated to [TypeScript](https://www.typescriptlang.org/). New classes and files should be written in TypeScript. All compiled files are generated next to the .ts or .tsx file. So for example, if there's a file "lib/MyClass.ts", there will be a generated "lib/MyClass.js" next to it. It is implemented that way as it requires minimal changes to integrate TypeScript in the existing JavaScript code base.

## Hot reload

If you'd like to auto-reload the desktop app on changes rather than having to quit and restart it manually each time, you can use [watchman-make](https://facebook.github.io/watchman/docs/watchman-make.html):

```sh
cd packages/app-desktop
watchman-make -p '**/*.js' '**/*.jsx' --run "yarn start"
```

It still requires you to quit the application each time you want it to rebuild, but at least you don't have to re-run `"yarn start"` each time. Here's what the workflow loop looks like in practice:

1. Edit and save files in your text editor.
2. Switch to the Electron app and <kbd>cmd</kbd>+<kbd>Q</kbd> to quit it.
3. `watchman` immediately restarts the app for you (whereas usually you'd have to switch back to the terminal, type `"yarn start"`, and hit enter).

## Troubleshooting

Please read for the [Build Troubleshooting Document](https://github.com/laurent22/joplin/blob/dev/readme/dev/build_troubleshooting.md) for various tips on how to get the build working.
