# Extending Joplin

Joplin provides a number of extension points to allow third-party applications to access its data, or to develop plugins.

The two main extension points are:

- The [data API](https://github.com/laurent22/joplin/blob/dev/readme/api/references/rest_api.md), which is a server that provides access to Joplin data to external applications. It is possible, using standard HTTP calls, to create, modify or delete notes, notebooks, tags, etc. as well as attach files to notes and retrieve these files. This is for example how the web clipper communicates with Joplin.

- The [plugin API](https://joplinapp.org/api/references/plugin_api/classes/joplin.html), which allows directly modifying Joplin by adding new features to the application. Using this API, you can:
	- Access notes, folders, etc. via the data API
	- Add a view to display custom data using HTML/CSS/JS
	- Create a dialog to display information and get input from the user
	- Create a new command and associate a toolbar button or menu item with it
	- Get access to the note currently being edited and modify it
	- Listen to various events and run code when they happen
	- Hook into the application to set additional options and customise Joplin's behaviour
	- Create a module to export or import data into Joplin
	- Define new settings and setting sections, and get/set them from the plugin