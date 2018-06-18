# Joplin Web Clipper

The Web Clipper is a browser extension that allows you to save web pages and screenshots from your browser. To start using it, open the Joplin desktop application, go to the **Web Clipper Options** and follow the instructions.

<img src="https://joplin.cozic.net/images/WebExtensionScreenshot.png" style="max-width: 100%">

# Troubleshooting the web clipper service

The web clipper extension and the Joplin application communicates via a service, which is started by the Joplin desktop app.

However certain things can interfer with this service and prevent it from being accessible or from starting. If something does not work, check the following:

- Check that the service is started. You can check this in the Web clipper options in the desktop app.
- Check that the port used by the service is not blocked by a firewall. You can find the port number in the Web clipper options in the desktop Joplin application.
- Check that no proxy is running on the machine, or make sure that the requests from the web clipper service are filtered and allowed. For example https://github.com/laurent22/joplin/issues/561#issuecomment-392220191

If none of this work, please report it on the [forum](https://discourse.joplin.cozic.net/) or [GitHub issue tracker](https://github.com/laurent22/joplin/issues)

# Debugging the extension

## In Chrome

To provide as much information as possible when reporting an issue, you may provide the log from the various Chrome console.

To do so, first enable developer mode in [chrome://extensions/](chrome://extensions/)

- Debugging the popup: Right-click on the Joplin extension icon, and select "Inspect popup".
- Debugging the background script: In `chrome://extensions/`, click on "Inspect background script".
- Debugging the content script: Press Ctrl+Shift+I to open the console of the current page.

## In Firefox

- Open [about:debugging](about:debugging) in Firefox.
- Make sure the checkox "Enable add-on debugging" is ticked.
- Scroll down to the Joplin Web Clipper extension.
- Click on "Debugging" - that should open a new console window.

Also press F12 to open the regular Firefox console (some messages from the Joplin extension can go there too).

Now use the extension as normal and replicate the bug you're having.

Copy and paste the content of both the debugging window and the Firefox console, and post it to the [forum](https://discourse.joplin.cozic.net/).

# Using the Web Clipper service

The Web Clipper service can be used to create notes from any other application. It exposes a [REST API](https://en.wikipedia.org/wiki/Representational_state_transfer) with a number of methods to list folders and to create notes or attach images.

In order to use it, you'll first need to find on which port the service is running. To do so, open the Web Clipper Option in Joplin and if the service is running it should tell you on which port. Normally it runs on port **41184**. If you want to find it programmatically, you may follow this kind of algorithm:

```javascript
let port = null;
for (let portToTest = 41184; portToTest <= 41194; portToTest++) {
    const result = pingPort(portToTest); // Call GET /ping
    if (result == 'JoplinClipperServer') {
        port = portToTest; // Found the port
        break;
    }
}
```

start from 41184, then ping it (using the /ping method below)

The following methods are available:

### GET /ping

Tells whether the service is active or not. It should return "JoplinClipperServer" if it works.

Example: `curl http://127.0.0.1:41184/ping`

### GET /folders

Returns the list of notebooks (called "folders" internally) as a tree. The sub-notebooks of a notebook, if any, are under the `children` key.

Example: `curl http://127.0.0.1:41184/folders`

### POST /notes

Creates a new note. You can either specify the note body as Markdown by setting the `body` parameter, or in HTML by setting the `body_html`.  All parameter are optional.

Parameters:

Key | Description
---|---
title | Note title
body | Note body, in Markdown
body_html | Note body, in HTML format
source_url | The URL the note comes from
parent_id | The notebook (ID) to move the note to
base_url | If `body_html` is provided and contains relative URLs, provide the `base_url` parameter too so that all the URLs can be converted to absolute ones. The base URL is basically where the HTML was fetched from, minus the query (everything after the '?'). For example if the original page was `https://stackoverflow.com/search?q=%5Bjava%5D+test`, the base URL is `https://stackoverflow.com/search`.
image_data_url | An image to attach to the note, in [Data URL](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs) format.
crop_rect | If an image is provided, you can also specify an optional rectangle that will be used to crop the image. In format `{ x: x, y: y, width: width, height: height }`

Examples:

* Create a note from some Markdown text

`curl --data '{ "title": "My note", "body": "Some note in **Markdown**"}' http://127.0.0.1:41184/notes`

* Create a note from some HTML

`curl --data '{ "title": "My note", "body_html": "Some note in <b>HTML</b>"}' http://127.0.0.1:41184/notes`

* Create a note and attach an image to it:

`curl --data '{ "title": "Image test", "body": "Here is Joplin icon:", "image_data_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAANZJREFUeNoAyAA3/wFwtO3K6gUB/vz2+Prw9fj/+/r+/wBZKAAExOgF4/MC9ff+MRH6Ui4E+/0Bqc/zutj6AgT+/Pz7+vv7++nu82c4DlMqCvLs8goA/gL8/fz09fb59vXa6vzZ6vjT5fbn6voD/fwC8vX4UiT9Zi//APHyAP8ACgUBAPv5APz7BPj2+DIaC2o3E+3o6ywaC5fT6gD6/QD9/QEVf9kD+/dcLQgJA/7v8vqfwOf18wA1IAIEVycAyt//v9XvAPv7APz8LhoIAPz9Ri4OAgwARgx4W/6fVeEAAAAASUVORK5CYII="}' http://127.0.0.1:41184/notes`