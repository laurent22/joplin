# Deploying Joplin apps and scripts

Various scripts are provided to deploy the Joplin applications, scripts and tools.

## Setting up version numbers

Before new releases are created, all version numbers must be updated. This is done using the `setupNewRelease` script and passing it the new major.minor version number. For example:

	yarn run setupNewRelease 1.8

Patch numbers are going to be incremented automatically when releasing each individual package.

## Desktop application

The desktop application is built for Windows, macOS and Linux via continuous integration, by pushing a version tag to GitHub. The process is automated using:

	yarn run releaseDesktop

## Android application

The app is built and upload to GitHub using:

	yarn run releaseAndroid --type=prerelease

The "type" parameter can be either "release" or "prerelease"

## iOS application

It must be built and released manually using XCode.

## CLI application

Unlike the mobile or desktop application, the CLI app doesn't bundle its dependencies and is always installed from source. For that reason, all its `@joplin` dependencies must be deployed publicly first. This is done using:

	yarn run publishAll

This is going to publish all the Joplin libraries, such as `@joplin/lib`, `@joplin/tools`, etc.

Then in `app-cli/package.json`, all `@joplin` dependencies and devdependencies must be set to the last major/minor version. For example:

```json
"dependencies": {
	"@joplin/lib": "1.8",
	"@joplin/renderer": "1.8",
	"...": "..."
},
"devDependencies": {
	"@joplin/tools": "1.8",
	"...": "..."
}
```

Finally, to release the actual app, run:

	yarn run releaseCli

## Joplin Server

Run:

	yarn run releaseServer

## Web clipper

Run:

	yarn run releaseClipper

## Plugin generator

First the types should generally be updated, using `./updateTypes.sh`. Then run:

	yarn run releasePluginGenerator

## Plugin Repo Cli

This tool is packaged using Webpack so it can be released with a single command:

	yarn run releasePluginRepoCli
