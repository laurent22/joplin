# Debugging mobile plugins

## Running on web

It may be easiest to test custom mobile plugins in the [web build](https://joplin.github.io/web-app/) of Joplin mobile. This eliminates the need to transfer the plugin's built `.jpl` file to an Android device after every change.

To install a custom plugin on web,
1. Build your plugin (run `npm run dist` from the plugin's directory).
2. Open [web build](https://joplin.github.io/web-app/) of Joplin mobile.
3. Go to "Configuration" > "Plugins" > "Enable plugin support" > "Advanced".
4. Click "Install from file".
5. Navigate to the base directory of your plugin.
6. Open the `publish/` folder.
7. Select the `.jpl` file.

Your plugin should now be loaded!

:::note

If you encounter an "incompatible with Joplin mobile" error, be sure that `"platforms": ["mobile", "desktop"]` is included in your plugin's `manifest.json` ([documentation](./plugin_manifest.md)).

:::

After loading, plugins are run in an `<iframe>` with an `about:srcdoc` URL.


## Getting console output

By default, messages logged with `console.info`, `console.warn`, and `console.error` are added to Joplin's logs. To view these logs,
1. Open Joplin's log screen (Configuration > Tools > Logs).
2. Click "Search".
3. Type your plugin's ID (or a large part of it) into the "filter" input.

If Joplin is running in development mode, messages logged with `console.log` are also added to Joplin's logs.


## Android: Inspecting a WebView

On mobile, all plugins run in a `WebView`.

On Android, it's possible to inspect this `WebView` with Google Chrome's development tools. To do this,
1. Enable plugin WebView debugging. To do this, go to "Configuration" > "Plugins" > "Advanced settings" and enable "Plugin webview debugging".
2. Restart Joplin.
3. Follow the [Chrome devtools instructions for debugging Android devices](https://developer.chrome.com/docs/devtools/remote-debugging/).


