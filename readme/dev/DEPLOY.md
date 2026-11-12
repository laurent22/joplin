# Deploying Joplin apps and scripts

Various scripts are provided to deploy the Joplin applications, scripts and tools.

## Setting up version numbers

Before new releases are created, all version numbers must be updated. This is done using the `setupNewRelease` script and passing it the new major.minor version number. For example:

	yarn setupNewRelease 1.8

Patch numbers are going to be incremented automatically when releasing each individual package.

## Desktop application

The desktop application is built for Windows, macOS and Linux via continuous integration, by pushing a version tag to GitHub. The process is automated using:

	yarn releaseDesktop

## Android application

The app is built and uploaded to GitHub using:

	yarn releaseAndroid --type=prerelease

The "type" parameter can be either "release" or "prerelease"

## iOS application

It must be built and released manually using XCode.

## CLI application

Unlike the mobile or desktop application, the CLI app doesn't bundle its dependencies and is always installed from source. For that reason, all its `@joplin` dependencies, such as `@joplin/lib`, `@joplin/tools`, etc., must be published to npm with it.

In `app-cli/package.json`, all `@joplin` dependencies and devdependencies must be set to the last major/minor version. For example:

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

Then, to release the app, run:

	yarn releaseCli

This is going to bump the version of the app and of all the Joplin libraries, then generate the changelog. Once the changelog has been checked, run the printed commands to commit and push a `cli-v*` tag. The tag triggers the `publish-sub-packages.yml` workflow, which builds and publishes the libraries, then the app, to npm using [trusted publishing](https://docs.npmjs.com/trusted-publishers).

To publish only the libraries, run `yarn publishAll` instead. It bumps their versions, then commits and pushes a `sub-packages-v*` tag, which triggers the same workflow.

The `joplin` package and each library must have `laurent22/joplin` and `publish-sub-packages.yml` registered as a trusted publisher on npmjs.com, with "Allow npm publish" enabled. When adding a new library, it must be published once manually before this can be configured.

## Joplin Server

Run:

	yarn releaseServer

## Web clipper

Run:

	yarn releaseClipper

## Plugin generator

First the types should generally be updated, using `./updateTypes.sh`. Then run:

	yarn releasePluginGenerator

## Plugin Repo Cli

This tool is packaged using Webpack so it can be released with a single command:

	yarn releasePluginRepoCli
