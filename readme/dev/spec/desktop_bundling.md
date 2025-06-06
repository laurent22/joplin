# Desktop app bundling

For performance and to reduce the application size, the desktop app is bundled with [esbuild](https://esbuild.github.io/). Bundling packs most of the desktop application's JavaScript into one or two JavaScript files. This occurs as a part of both `yarn dist` and `yarn start`.

## Why bundle the app?

- **Performance**: Bundling the app [is recommended by the Electron performance guide](https://www.electronjs.org/docs/latest/tutorial/performance#7-bundle-your-code). The guide states that "Loading modules is a surprisingly expensive operation, especially on Windows." Bundling the application reduces the number of `require` calls.
- **Application size**: Bundling can reduce the size of the app created by `yarn dist`.

## How does bundling reduce the application size?

Bundling allows both:
1. Reducing the size of the JavaScript included in the app through [minification](https://esbuild.github.io/api/#minify), and
2. Reducing the number of dependencies included in `node_modules` in the version of the app built with `electron-builder`. Dependencies often include files unnecessary for the final build (e.g. README images, test files).


## Excluding dependencies from `node_modules`

After bundling the app, most dependencies are completely included within `main.bundle.js` or `main-html.bundle.js`. As a result, the copies of these dependencies in `node_modules` are completely unused.

Some dependencies need to be included in `node_modules` at runtime. This is the case, for example, if the dependency needs to be required with `shim.requireDynamic`, or if the dependency includes native `.node` assets that can't be bundled. For example, `sqlite3` includes native `.node` assets that need to be in `node_modules` at runtime.

Electron-builder can be instructed to exclude dependencies from the built application [by moving them to `devDependencies`](https://github.com/electron-userland/electron-builder/blob/84657680ba5688f1594bc77be3df5c2c78125723/README.md?plain=1#L73). A dependency should only be in the production `dependencies` if it needs to be included in `node_modules` at runtime.

## Determining what contributes to the bundle size

To see what contributes to the size of the application's bundled JavaScript, consider using [esbuild's bundle size analyzer](https://esbuild.github.io/analyze/). The size analyzer accepts esbuild metafiles. To build these metafiles, manually run `yarn bundle`. Bundle metadata will be written to the `app-desktop` directory as `.meta.json` files.
