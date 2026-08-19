# Joplin Web App

The Joplin Web App provides access to Joplin from a web browser, without installing anything. It is available at [app.joplincloud.com](https://app.joplincloud.com), and is essentially the Joplin mobile app running in a browser.

## Storage and synchronisation

Joplin Web is local-first. Notes and attachments are stored locally in your browser, so the app can be used offline, and they can optionally be synced with one of the supported [sync targets](https://joplinapp.org/help/apps/sync/).

Until synchronisation is configured, each browser (or browser profile) has its own separate note collection. Clearing your browser's site data for the web app will delete the local copy of your notes — if synchronisation is configured you can recover them by signing in again, otherwise the data cannot be recovered.

## Supported browsers

The web app works best in recent versions of Chrome and Safari. It also runs in Firefox, but startup is slow.

Some features are available only on certain platforms:

- Share note content[^2]:
	- ✅ Safari
	- ✅ Chrome (Android)
	- ❌ Chrome (Desktop)
	- ❌ Firefox
- Insert images from a camera:
	- ✅ Safari
	- ✅ Chrome (Android)
	- ❌ Chrome (Desktop)
	- ❌ Firefox
- Drop images and files from another app:
	- ✅ Chrome (Desktop), Safari, Firefox (Desktop)
	- ❌ Chrome (Android)

[^1]: Requires [support for showDirectoryPicker](https://caniuse.com/?search=showDirectoryPicker).
[^2]: Requires [Web Share API support](https://caniuse.com/?search=web%20share%20api).
