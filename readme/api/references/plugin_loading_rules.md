# Plugin Loading Rules

When loading plugins from the profile `plugins` directory, Joplin will look at the following locations:

- `plugins/PLUGIN_ID.js`
- `plugins/PLUGIN_ID/index.js`
- `plugins/PLUGIN_ID/dist/index.js`
- Any directory or file that starts with "_" will be excluded. This can be used to disable a plugin without having to delete it from the directory.

`PLUGIN_ID` can be any string but it must be unique.