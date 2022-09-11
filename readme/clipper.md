# Joplin Web Clipper

The Web Clipper is a browser extension that allows you to save web pages and screenshots from your browser. Currently, the Web Clipper is available as a browser extension for Google Chrome as well as Mozilla Firefox. To start using it, open the Joplin desktop application, go to the **Web Clipper Options** and follow the instructions.

<img src="https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/WebExtensionScreenshot.png" style="max-width: 50%; border: 1px solid gray;">

# Installation and Setup

- Install the Joplin Web Clipper browser extension for either [Google Chrome](https://chrome.google.com/webstore/detail/joplin-web-clipper/alofnhikmmkdbbbgpnglcpdollgjjfek) or [Mozilla Firefox](https://addons.mozilla.org/en-US/firefox/addon/joplin-web-clipper/).
- Install the Joplin Desktop application, if you have not already done so.
- Open the Joplin Desktop app and select the **Tools** tab at the top.
- Then, click on the **Options** tab from the dropdown menu.
- Choose the **Web Clipper** tab from the menu on the left side of the window.
- Press the button that says **Enable Web Clipper Service**.

Enabling the Web Clipper service will enable the browser extension app to communicate with the Joplin app. This would allow you to access all your saved webpages and browser screenshots taken through the Web Clipper along with all your other notes at one place on the Joplin app. In the same location you can also find an authorization token under the **Advanced Options** section. This token is only needed if you want to allow third-party applications to access Joplin.

# Using the Web Clipper extension

To use the Web Clipper, simply click on the extensions tab that is usually located to the right of the address bar. Select the Joplin Web Clipper from the list of extensions. While using the Web Clipper for the first time, it may ask you to complete authorization in order to access your data. To proceed, open the Joplin desktop application where you will see a pop up. Grant permission to Web Clipper by clicking on the **Grant Authorization** button.

Once you have completed the authorization process, you can see the following menu when you click on the Joplin Web Clipper from the extensions tab.

![Screenshot](https://user-images.githubusercontent.com/58488861/189547712-071948f7-6f2a-4454-80cd-8c2b997e7d91.png)

- Clip simplified page: This feature will allow you to store the contents of the entire webpage as simplified text and images to your notebook.
- Clip complete page (Markdown): Using this feature, you can store the contents of the webpage to your notebook in markdown format.
- Clip complete page (HTML): This feature allows you to store the contents of a webpage to your notebook as HTML code.
- Clip selection: Using this feature, you can store only the selected part of the webpage to your notebook. The content will be stored in markdown format for this feature.
- Clip screenshot: This feature will allow you to drag your mouse and select a rectangular section of the browser screen that you want to store as a screenshot to your notebook.
- Clip URL: This feature saves the URL of the open webpage to your notebook.

To use any of the features, simply click on the button with feature that you want to use. You can then edit the title that you want to use for the note. Finally, click on **Confirm** to save the note. Once the note is saved, it will give you an option to open the newly created note. Clicking that button will take you to the new note in your notebook in the Joplin desktop app. You can also choose the notebook in which you want to save the note through a dropdown menu on the panel. You can create new notebooks through the Joplin desktop app.

# Troubleshooting the web clipper service

The web clipper extension and the Joplin application communicates via a service, which is started by the Joplin desktop app.

However certain things can interfere with this service and prevent it from being accessible or from starting. If something does not work, check the following:

- Check that the service is started. You can check this in the Web clipper options in the desktop app.
- Check that the port used by the service is not blocked by a firewall. You can find the port number in the Web clipper options in the desktop Joplin application.
- Check that no proxy is running on the machine, or make sure that the requests from the web clipper service are filtered and allowed. For example https://github.com/laurent22/joplin/issues/561#issuecomment-392220191

If none of this work, please report it on the [forum](https://discourse.joplinapp.org/) or [GitHub issue tracker](https://github.com/laurent22/joplin/issues)

# Debugging the extension

## In Chrome

To provide as much information as possible when reporting an issue, you may provide the log from the various Chrome console.

To do so, first enable developer mode in [chrome://extensions/](chrome://extensions/)

- Debugging the popup: Right-click on the Joplin extension icon, and select "Inspect popup".
- Debugging the background script: In `chrome://extensions/`, click on "Inspect background script".
- Debugging the content script: Press Ctrl+Shift+I to open the console of the current page.

## In Firefox

- Open [about:debugging](about:debugging) in Firefox.
- Make sure the checkbox "Enable add-on debugging" is ticked.
- Scroll down to the Joplin Web Clipper extension.
- Click on "Debugging" - that should open a new console window.

Also press F12 to open the regular Firefox console (some messages from the Joplin extension can go there too).

Now use the extension as normal and replicate the bug you're having.

Copy and paste the content of both the debugging window and the Firefox console, and post it to the [forum](https://discourse.joplinapp.org/).

# Using the Web Clipper service

The Web Clipper service can be used to create, modify or delete notes, notebooks, tags, etc. from any other application. The browser extension form allows you to take notes directly from a webpage instead of having to retype everything. It exposes an API with a number of methods to manage Joplin's data. For more information about this API and how to use it, please check the [Joplin API documentation](https://joplinapp.org/api/references/rest_api/).
