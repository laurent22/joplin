# Debugging mobile plugins

## Running on web

Plugins can be installed from `.jpl` files in the [web build](https://app.joplincloud.com/) of the mobile app. This can help with mobile plugin development in a few ways:
- Eliminates the need to transfer the plugin's built `.jpl` file to an Android device after every change.
- It may be easier to inspect running plugins from a browser's development tools.

To install a custom plugin on web,
1. Build your plugin (run `npm run dist` from the plugin's directory).
2. Open [web build](https://app.joplincloud.com/) of Joplin mobile.
3. Go to "Configuration" > "Plugins" > "Enable plugin support" > "Advanced".
4. Click "Install from file".
5. Navigate to the base directory of your plugin.
6. Open the `publish/` folder.
7. Select the `.jpl` file.

Your plugin should now be loaded!

:::note

If you encounter an "incompatible with Joplin mobile" error, be sure that `"platforms": ["mobile", "desktop"]` is included in your plugin's `manifest.json` ([documentation](./plugin_manifest.md)).

:::

After loading, plugins are run in an `<iframe>` with an `about:srcdoc` URL. To view the plugin's console output and interact with global plugin variables (e.g. `joplin.commands`),
1. Open your browser's development tools.
   - On most desktop browsers, this can be done by pressing <kbd>F12</kbd>.
   - The following steps were tested on Firefox, Chrome, and Safari desktop.
2. Click on the "Console" tab.
3. To run JavaScript in the context of your plugin, [select its JavaScript context](https://developer.chrome.com/docs/devtools/console/reference#context).
   - The JavaScript context will be named `about:srcdoc`.
   - If using Chrome's DevTools, the [`debug`](https://developer.chrome.com/docs/devtools/console/utilities#debug-function) and other console utility function may be helpful.

## Web: Automatic reloading

In some browsers, the web version of the mobile app supports development plugins. Development plugins automatically reload when changed on disk. Non-development plugins must be re-installed when changed.

To add a development plugin:
1. Open the web version of Joplin mobile in a Chromium-based browser.
   - Development plugins are loaded with `showOpenFilePicker`. As of early 2025, [only Chrome and several Chromium-based browsers support this API](https://developer.mozilla.org/en-US/docs/Web/API/Window/showOpenFilePicker#browser_compatibility).
2. Open Configuration > Plugins > Advanced.
3. Click "Development plugins".
4. Select a plugin folder.
   - This folder should contain the `publish`, `dist`, and `src` folders for the plugin.
5. Click "save".

**Note**: Markdown editor plugins may not fully reload unless either the page is reloaded or the Markdown editor is closed and re-opened.

## Android: Inspecting a WebView

On mobile, all plugins run in `iframe`s within a `WebView`.

On Android, it's possible to inspect this `WebView` with Google Chrome's development tools. To do this,
1. Enable plugin WebView debugging. To do this, go to "Configuration" > "Plugins" > "Advanced settings" and enable "Plugin webview debugging".
2. Restart Joplin.
3. Follow the [Chrome devtools instructions for debugging Android devices](https://developer.chrome.com/docs/devtools/remote-debugging/).


## Getting console output from Joplin's logs

By default, messages logged with `console.info`, `console.warn`, and `console.error` are added to Joplin's logs. To view these logs,
1. Open Joplin's log screen (Configuration > Tools > Logs).
2. Click "Search".
3. A search box labeled "filter" should be available. Enter your plugin's ID (or a large part of it).

If Joplin is running in development mode, messages logged with `console.log` are also added to Joplin's logs.


