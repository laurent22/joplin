# generator-joplin

Scaffolds out a new Joplin plugin

## Installation

First, install [Yeoman](http://yeoman.io) and generator-joplin using [npm](https://www.npmjs.com/) (we assume you have pre-installed [node.js](https://nodejs.org/)).

```bash
npm install -g yo
npm install -g generator-joplin
```

Then generate your new project:

```bash
yo joplin
```

## Development

To test the generator for development purposes, follow the instructions there: https://yeoman.io/authoring/#running-the-generator
This is a template to create a new Joplin plugin.

## Structure

The main two files you will want to look at are:

- `/src/index.ts`, which contains the entry point for the plugin source code.
- `/src/manifest.json`, which is the plugin manifest. It contains information such as the plugin a name, version, etc.

The file `/plugin.config.json` could also be useful if you intend to use [external scripts](#external-script-files), such as content scripts or webview scripts.

## Building the plugin

The plugin is built using Webpack, which creates the compiled code in `/dist`. A JPL archive will also be created at the root, which can use to distribute the plugin.

To build the plugin, simply run `npm run dist`.

The project is setup to use TypeScript, although you can change the configuration to use plain JavaScript.

## Publishing the plugin

To publish the plugin, add it to npmjs.com by running `npm publish`. Later on, a script will pick up your plugin and add it automatically to the Joplin plugin repository as long as the package satisfies these conditions:

- In `package.json`, the name starts with "joplin-plugin-". For example, "joplin-plugin-toc".
- In `package.json`, the keywords include "joplin-plugin".
- In the `publish/` directory, there should be a .jpl and .json file (which are built by `npm run dist`)

In general all this is done automatically by the plugin generator, which will set the name and keywords of package.json, and will put the right files in the "publish" directory. But if something doesn't work and your plugin doesn't appear in the repository, double-check the above conditions.

## Updating the plugin framework

To update the plugin framework, run `npm run update`.

In general this command tries to do the right thing - in particular it's going to merge the changes in package.json and .gitignore instead of overwriting. It will also leave "/src" as well as README.md untouched.

The file that may cause problem is "webpack.config.js" because it's going to be overwritten. For that reason, if you want to change it, consider creating a separate JavaScript file and include it in webpack.config.js. That way, when you update, you only have to restore the line that include your file.

## External script files

By default, the compiler (webpack) is going to compile `src/index.ts` only (as well as any file it imports), and any other file will simply be copied to the plugin package. In some cases this is sufficient, however if you have [content scripts](https://joplinapp.org/api/references/plugin_api/classes/joplincontentscripts.html) or [webview scripts](https://joplinapp.org/api/references/plugin_api/classes/joplinviewspanels.html#addscript) you might want to compile them too, in particular in these two cases:

- The script is a TypeScript file - in which case it has to be compiled to JavaScript.

- The script requires modules you've added to package.json. In that case, the script, whether JS or TS, must be compiled so that the dependencies are bundled with the JPL file.

To get such an external script file to compile, you need to add it to the `extraScripts` array in `plugin.config.json`. The path you add should be relative to /src. For example, if you have a file in "/src/webviews/index.ts", the path should be set to "webviews/index.ts". Once compiled, the file will always be named with a .js extension. So you will get "webviews/index.js" in the plugin package, and that's the path you should use to reference the file.

## License

MIT © Laurent Cozic
