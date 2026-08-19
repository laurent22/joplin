# Website

This website is built using [Docusaurus 2](https://docusaurus.io/), a modern static website generator.

## Development

### Generating the MDX files

From `packages/tools`, run `node website/processDocs.js --env dev`

### Building the doc

From `packages/doc-builder`, run:

```shell
WEBSITE_BASE_URL=http://localhost:8077 yarn buildDev
```

Or to build a particular locale:

```shell
WEBSITE_BASE_URL=http://localhost:8077 yarn buildDev --locale fr
```

`processDocs.js` will also build everything by default, but it takes a long time, so using the above commands is convenient for dev.

### Watching

To watch the doc website, run `yarn start` from `packages/doc-builder`

Alternatively, to test the doc website after it has been built, build it using one of the above commands, then run `yarn watchWebsite` from the root. This allows testing the website in "production" conditions, after prod-only plugins have been executed.

## Translation

Translation is done using https://crowdin.com/

### Uploading the string

```shell
CROWDIN_PERSONAL_TOKEN=..... yarn crowdinUpload
```

### Getting the translations

```shell
CROWDIN_PERSONAL_TOKEN=..... yarn crowdinDownload
```

### Adding a translation

- Make sure the translation is available in Crowdin
- In `packages/doc-builder/docusaurus.config.js`, add the language code to `i18n.locales`

## Building for production

This is done in `release-website.sh` from the repository https://github.com/joplin/website/
