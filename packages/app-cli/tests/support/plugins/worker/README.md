# Worker example

This plugin demonstrates how to create a `Worker` and, within it, use `transformers.js` for text classification.

At present, this plugin only works on desktop. However, it should also be possible to load the `Worker` from a plugin panel or dialog on mobile (but not web).

**Notes**:
- `plugin.config.json` was updated to target **web**. This allows the plugin to load `transformers.js` from the worker without depending on `node-loader`.
   - This simplifies the build process and should make it easier to add mobile and web support to this plugin.
- WASM files and other assets are copied by `tools/copyAssets.js`.
