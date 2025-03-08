# Joplin Web Clipper

The Web Clipper is a browser extension that allows you to save web pages and screenshots from your browser. To start using it, open the Joplin desktop application, go to the [Configuration screen](https://github.com/laurent22/joplin/blob/dev/readme/apps/config_screen.md), open the **Web Clipper** section and follow the instructions.

<img src="https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/WebExtensionScreenshot.png" style="max-width: 50%; border: 1px solid gray;">

## Troubleshooting the web clipper service

The web clipper extension and the Joplin application communicates via a service, which is started by the Joplin desktop app.

However certain things can interfere with this service and prevent it from being accessible or from starting. If something does not work, check the following:

- Check that the service is started. You can check this in the Web clipper options in the desktop app.
- Check that the port used by the service is not blocked by a firewall. You can find the port number in the Web clipper options in the desktop Joplin application.
- Check that no proxy is running on the machine, or make sure that the requests from the web clipper service are filtered and allowed. For example https://github.com/laurent22/joplin/issues/561#issuecomment-392220191

If none of this work, please report it on the [forum](https://discourse.joplinapp.org/) or [GitHub issue tracker](https://github.com/laurent22/joplin/issues)

## Debugging the extension

### In Chrome

To provide as much information as possible when reporting an issue, you may provide the log from the various Chrome console.

To do so, first enable developer mode in [chrome://extensions/](chrome://extensions/)

- Debugging the popup: Right-click on the Joplin extension icon, and select "Inspect popup".
- Debugging the background script: In `chrome://extensions/`, click on "Inspect background script".
- Debugging the content script: Press Ctrl+Shift+I to open the console of the current page.

### In Firefox

- Open [about:debugging](about:debugging) in Firefox.
- Make sure the checkbox "Enable add-on debugging" is ticked.
- Scroll down to the Joplin Web Clipper extension.
- Click on "Debugging" - that should open a new console window.

Also press F12 to open the regular Firefox console (some messages from the Joplin extension can go there too).

Now use the extension as normal and replicate the bug you're having.

Copy and paste the content of both the debugging window and the Firefox console, and post it to the [forum](https://discourse.joplinapp.org/).

## Using the Web Clipper service

The Web Clipper service can be used to create, modify or delete notes, notebooks, tags, etc. from any other application. It exposes an API with a number of methods to manage Joplin's data. For more information about this API and how to use it, please check the [Joplin API documentation](https://github.com/laurent22/joplin/blob/dev/readme/api/references/rest_api.md).
