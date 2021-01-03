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
