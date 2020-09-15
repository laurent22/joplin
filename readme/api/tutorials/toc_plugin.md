# Creating a table of content plugin

This tutorial will guide you through the steps to create a table of content plugin for Joplin. It will display a view next to the current note that will contain the table of content. It will be possible to click on one of the header to jump to the relevant section.

Through this tutorial you will learn about several aspect of the Joplin API, including:

- The plugin API
- How to create a webview
- How to listen to changes in the user interface

## Setting up your environment

First you need to setup your environment:

- Make sure you have [Node.js]() and [git]() installed.
- Install Joplin and run it in development mode.


You will also need to have Joplin installed and running in development mode, which we'll describe later. EXPLAIN NOW

But first install Yeoman and the Joplin Plugin Generator:

	npm install -g yo generator-joplin

This will create the basic scafolding of the plugin. At the root of it, there is a number of configuration files which you normally won't need to change. Then the `src/` directory will contain your code. By default, the project uses TypeScript, but you are free to use plain JavaScript too - eventually the project is compiled to plain JS in any case.

The `src/` directory also contains a [manifest.json]() file, which you can edit to set various information about the plugin, such as its name, homepage URL, etc.

## Building the plugin

The file `src/index.ts` already contain some basic code meant for testing the plugin. In particular it contains a call to [joplin.plugins.register](), which all plugins should call to register the plugin. And an [onStart]() event handler, which will be executed by Joplin when the plugin starts.

To try this basic plugin, compile the app by running the following from the root of the project:

	npm run dist

Doing so should compile all the files into the `dist/` directory. This is from here that Joplin will load the plugin.

## Testing the plugin

In order to test the plugin, you might want to run Joplin in development mode. Doing so means that Joplin will run using a different profile, which means you can experiment with the plugin without risking to accidentally change or delete your data. To do so, open Joplin as normal, then go to **Help => Copy dev mode command to clipboard**. This will copy a command to the clipboard. Now close Joplin, and start it again in dev mode using the command you've copied.

