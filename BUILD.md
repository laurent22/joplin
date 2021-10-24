# Building the applications

The Joplin source code is hosted on a [monorepo](https://en.wikipedia.org/wiki/Monorepo) managed by Lerna. The usage of Lerna is mostly transparent as the needed commands have been moved to the root package.json and thus are invoked for example when running `npm install` or `npm run watch`. The main thing to know about Lerna is that it links the packages in the monorepo using `npm link`, so if you check the node_modules directory you will see links instead of actual directories for certain packages. This is something to keep in mind as these links can cause issues in some cases.

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

- Install node 14+ - https://nodejs.org/en/
- macOS: Install Cocoapods - `brew install cocoapods`
- Windows: Install Windows Build Tools - `npm install -g windows-build-tools --vs2015`
- Linux: Install dependencies - `sudo apt install libnss3 libsecret-1-dev python rsync`

## Building

Before doing anything else, from the root of the project, run:

	npm install

Then you can test the various applications:

## Testing the desktop application

	cd packages/app-desktop
	npm start

You can also run it under WSL 2. To do so, [follow these instructions](https://www.beekeeperstudio.io/blog/building-electron-windows-ubuntu-wsl2) to setup your environment.

## Testing the Terminal application

	cd packages/app-cli
	npm start

## Testing the Mobile application

First you need to setup React Native to build projects with native code. For this, follow the instructions in the [Setting up the development environment](https://reactnative.dev/docs/environment-setup) tutorial, in the "React Native CLI Quickstart" tab.

Then, for **Android**:

	cd packages/app-mobile/android
	./gradlew installDebug # or gradlew.bat installDebug on Windows

On **iOS**, open the file `ios/Joplin.xcworkspace` on XCode and run the app from there.

Normally the **bundler** should start automatically with the application. If it doesn't, run `npm start` from `packages/app-mobile`.

## Building the clipper

	cd packages/app-clipper/popup
	npm install
	npm run watch # To watch for changes

To test the extension please refer to the relevant pages for each browser: [Firefox](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_first_WebExtension#Trying_it_out) / [Chrome](https://developer.chrome.com/docs/extensions/mv3/getstarted/). Please note that the extension in dev mode will only connect to a dev instance of the desktop app (and vice-versa).

## Watching files

To make changes to the application, you'll need to rebuild any TypeScript file you've changed. The simplest way to do this is to watch for changes from the root of the project. Simply run this command, and it should take care of the rest:

	npm run watch

Running `npm run tsc` would have the same effect, but without watching.

## Running an application with additional parameters

You can specify additional parameters when running the desktop or CLI application. To do so, add `--` to the `npm start` command, followed by your flags. For example:

	npm start -- --debug

## Adding a new dependency

Since Joplin uses Lerna, adding a new dependency should not be done using `npm i -s ...`. Instead you should use the `lerna add` command, which will take care of adding the package while handling the linked packages correctly. For example, to add the package "leftpad" to the "app-desktop" sub-package, you would run:

	npx lerna add leftpad --scope=@joplin/app-desktop

Note that you should most likely always specify a scope because otherwise it will add the package to all the sub-packages.

## TypeScript

The application was originally written in JavaScript, however it has slowly been migrated to [TypeScript](https://www.typescriptlang.org/). New classes and files should be written in TypeScript. All compiled files are generated next to the .ts or .tsx file. So for example, if there's a file "lib/MyClass.ts", there will be a generated "lib/MyClass.js" next to it. It is implemented that way as it requires minimal changes to integrate TypeScript in the existing JavaScript code base.

## Hot reload

If you'd like to auto-reload the desktop app on changes rather than having to quit and restart it manually each time, you can use [watchman-make](https://facebook.github.io/watchman/docs/watchman-make.html):

```sh
cd packages/app-desktop
watchman-make -p '**/*.js' '**/*.jsx' --run "npm start"
```

It still requires you to quit the application each time you want it to rebuild, but at least you don't have to re-run `"npm start"` each time. Here's what the workflow loop looks like in practice:

1. Edit and save files in your text editor.
2. Switch to the Electron app and <kbd>cmd</kbd>+<kbd>Q</kbd> to quit it.
3. `watchman` immediately restarts the app for you (whereas usually you'd have to switch back to the terminal, type `"npm start"`, and hit enter).

# Troubleshooting

Please read for the [Build Troubleshooting Document](https://github.com/laurent22/joplin/blob/dev/readme/build_troubleshooting.md) for various tips on how to get the build working.
