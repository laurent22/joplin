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

## Building the plugin

The plugin is built using Webpack, which creates the compiled code in `/dist`. A JPL archive will also be created at the root, which can use to distribute the plugin.

To build the plugin, simply run `npm run dist`.

The project is setup to use TypeScript, although you can change the configuration to use plain JavaScript.

## Updating the plugin framework

To update the plugin framework, run `yo joplin --update`

Keep in mind that doing so will overwrite all the framework-related files **outside of the "src/" directory** (your source code will not be touched). So if you have modified any of the framework-related files, such as package.json or .gitignore, make sure your code is under version control so that you can check the diff and re-apply your changes.

For that reason, it's generally best not to change any of the framework files or to do so in a way that minimises the number of changes. For example, if you want to modify the Webpack config, create a new separate JavaScript file and include it in webpack.config.js. That way, when you update, you only have to restore the line that include your file.

## Content scripts

A plugin that uses [content scripts](https://joplinapp.org/api/references/plugin_api/classes/joplinplugins.html#registercontentscript) must declare them under the `content_scripts` key of [manifest.json](https://joplinapp.org/api/references/plugin_manifest/).

Each entry must be a path **relative to /src**, and **without extension**. The extension should not be included because it might change once the script is compiled. Each of these scripts will then be compiled to JavaScript and packaged into the plugin file. The content script files can be TypeScript (.ts or .tsx) or JavaScript.

For example, assuming these files:

```bash
/src
    index.ts                # Main plugin script
    myContentScript.js      # One content script (JS)
    otherContentScript.ts   # Another content script (TypeScript)
    vendor/
        test.ts             # Sub-directories are also supported
```

The `manifest.json` file would be:

```json
{
    "manifest_version": 1,
    "name": "Testing Content Scripts",
    content_scripts: [
        "myContentScript",
        "otherContentScript",
        "vendor/test"
    ]
}
```

Note in particular how the file path is relative to /src and the extensions removed.

## License

MIT © Laurent Cozic
