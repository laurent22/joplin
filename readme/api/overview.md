# Extending Joplin

Joplin provides a number of extension points to allow third-party applications to access its data, or to develop plugins.

The two main extension points are:

- The [data API](), which is a server that provides access to Joplin data to external applications. It is possible, using standard HTTP calls, to create, modify or delete notes, notebooks, tags, etc. as well as attach files to notes and retrieve these files. This is for example how the web clipper communicates with Joplin.

- The [plugin API](), which allows directly modifying Joplin by adding new features to the application. Using this API, you can:
	- Add a view to display custom data using HTML/CSS/JS - [Webview guide]()
	- Create a new command and a toolbar button or menu item for it - [Command guide]()
	- Hook into the application to set additional options and customise Joplin's behaviour - [Filter guide]()