# PDF VIEWER

A custom built PDF viewer for Joplin's use.
The viewer is designed to be rendered in an iframe.
This package produces the build files in `/dist` folder.

## Installation & Usage

From root of the project:

```bash
yarn install
```
This step will also build the viewer and pupulate the `/dist` folder.
We are using `weback` for build process.

When working on the viewer, after code updates you need to rebuild the viewer:

```bash
yarn build
```

The build process of `app-desktop` takes care of copying the content of `/dist` and the root html file to appropriate location.
