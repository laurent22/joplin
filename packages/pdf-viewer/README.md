# PDF VIEWER

A custom built PDF viewer for Joplin's use.
The viewer is designed to be rendered in an iframe.
This package produces the build files in `/dist` folder.

## Installation & Usage

From root of the project:

```bash
yarn install
```
This step will also run `yarn build` and build the viewer on post-install and populate the `/dist` folder.
We are using `weback` for build process.

When working on the viewer, after code updates you need to rebuild the viewer:

```bash
yarn build
```

Alternatively, you can use `yarn watch` to rebuild automatically on code changes.

```bash
yarn watch
```

The build process of `app-desktop` takes care of copying the content of `/dist` and the root html file to appropriate location.
