# Getting started with plugin development

In this article you will learn the basic steps to build and test a plugin in Joplin.

## Setting up your environment

First you need to setup your environment:

- Make sure you have [Node.js](https://nodejs.org/) and [git](https://git-scm.com) installed.
- Install [Joplin](https://joplinapp.org/)

But first install [Yeoman](https://yeoman.io/) and the [Joplin Plugin Generator](https://github.com/laurent22/joplin/tree/dev/packages/generator-joplin):
	
	npm install -g yo generator-joplin

Then, in the directory where you plan to develop the plugin, run:

	yo joplin

This will generate the basic scaffolding of the plugin. At the root of it, there are a number of configuration files which you normally won't need to change. Then the `src/` directory will contain your code. By default, the project uses TypeScript, but you are free to use plain JavaScript too - eventually the project is compiled to plain JS in any case.

The `src/` directory also contains a [manifest.json](https://github.com/laurent22/joplin/blob/dev/readme/api/references/plugin_manifest.md) file, which contains the various information about the plugin that was set in the initial generation of the scaffolding, such as its name, homepage URL, etc. You can edit this at any time, but editing it after it has been published may cause users to have to download it again.

## Setup Source Control 

In your plugin directory, run: 

	git init 

This will setup source control.


## Run Joplin in Development Mode

You should test your plugin in [Development Mode](https://github.com/laurent22/joplin/blob/dev/readme/api/references/development_mode.md). Doing so means that Joplin will run using a different profile, so you can experiment with the plugin without risking to accidentally change or delete your data.

## Building the plugin

From the scaffolding, `src/index.ts` now contains the basic code for a Hello World plugin. 

Two things to note:
1. It contains a call to [joplin.plugins.register](https://joplinapp.org/api/references/plugin_api/classes/joplinplugins.html#register). All plugins call this to register the plugin in the app.
2. An `onStart()` event handler method, which is called when the plugin starts.

To try this basic plugin, compile the app by running the following from the root of the project:

	npm run dist

Doing so should compile all the files into the `dist/` directory. This is where Joplin will load the plugin.

## Install the plugin
Open Joplin **Configuration > Plugins** section. Under Advanced Settings, add the plugin path in the **Development plugins** text field. 
This should be the path to your main plugin directory, i.e. `path/to/your/root/plugin/directory`.

## Test the Plugin, Hello World!
Restart the Development app from the command line/terminal, and Joplin should load the plugin and execute its `onStart` handler. If all went well you should see the test message in the plugin console: "Hello world. Test plugin started!". You will also be able to see the information from the manifest in the **Settings > Plugins**

# Next steps
Great, you now have the basics of a working plugin! 

- Start the [plugin tutorial](https://github.com/laurent22/joplin/blob/dev/readme/api/tutorials/toc_plugin.md) to learn how to use the plugin API.
- See what the plugin API supports, [Plugin API reference](https://joplinapp.org/api/references/plugin_api/classes/joplin.html).
- For plugin feature ideas, see this thread: https://discourse.joplinapp.org/t/any-suggestions-on-what-plugins-could-be-created/9479
