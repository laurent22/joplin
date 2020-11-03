# TinyMCE Joplin Lists Plugin

**As of 2020-11-02 this module no longer builds (a ton of TypeScript errors). No idea why since nothing was changed but should be investigated if modifying this plugin is ever needed.**

This is based on https://github.com/tinymce/tinymce/tree/59748a11303fb7cf00fdb8c9392dcb082ee9d965/modules/tinymce/src/plugins/lists

But with support for Joplin checkboxes.

## Building

Use `npm i && npm run build` to build the plugin, which will also copy the compiled version to the right packages/app-desktop sub-directory.

To test the plugin, use `npm run buildAndStart`, which will build the plugin and start the desktop application.