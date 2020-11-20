# Getting started with plugin development

In this article you will learn the basic steps to build and test a plugin in Joplin.

## Setting up your environment

First you need to setup your environment:

- Make sure you have [Node.js](https://nodejs.org/) and [git](https://git-scm.com) installed.
- Install Joplin and run it in development mode.

You will also need to have Joplin installed and running in development mode, which we'll describe later.

But first install Yeoman and the Joplin Plugin Generator:

	npm install -g yo generator-joplin

Then to create the plugin, run:

	yo joplin

This will create the basic scafolding of the plugin. At the root of it, there is a number of configuration files which you normally won't need to change. Then the `src/` directory will contain your code. By default, the project uses TypeScript, but you are free to use plain JavaScript too - eventually the project is compiled to plain JS in any case.

The `src/` directory also contains a [manifest.json](https://github.com/laurent22/joplin/blob/dev/readme/api/references/plugin_manifest/) file, which you can edit to set various information about the plugin, such as its name, homepage URL, etc.

## Building the plugin

The file `src/index.ts` already contain some basic code meant for testing the plugin. In particular it contains a call to [joplin.plugins.register](https://joplinapp.org/api/references/plugin_api/classes/joplinplugins.html), which all plugins should call to register the plugin. And an `onStart()` event handler, which will be executed by Joplin when the plugin starts.

To try this basic plugin, compile the app by running the following from the root of the project:

	npm run dist

Doing so should compile all the files into the `dist/` directory. This is from here that Joplin will load the plugin.

## Testing the plugin

In order to test the plugin, you might want to run Joplin in [Development Mode](https://github.com/laurent22/joplin/blob/dev/readme/api/references/development_mode.md). Doing so means that Joplin will run using a different profile, so you can experiment with the plugin without risking to accidentally change or delete your data.

Finally, in order to test the plugin, open the Setting screen, then navigate the the **Plugins** section, and add the plugin path in the **Development plugins** text field. For example, if your plugin project path is `/home/user/src/joplin-plugin`, add this in the text field.

Restart the app, and Joplin should load the plugin and execute its `onStart` handler. If all went well you should see the test message in the plugin console: "Test plugin started!".

# Next steps

- You might want to check the [plugin tutorial](https://github.com/laurent22/joplin/blob/dev/readme/api/tutorials/toc_plugin.md) to get a good overview of how to create a complete plugin and how to use the plugin API.
- For more information about the plugin API, check the [Plugin API reference](https://joplinapp.org/api/references/plugin_api/classes/joplin.html).
