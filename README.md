# Joplin

INTRODUCTION

![Joplin Terminal Screenshot](https://github.com/laurent22/joplin/blob/master/docs/images/ScreenshotTerminal.png)

# Installation

	npm install -g joplin

To start it, type `joplin`.

# Demo

The demo application shows various Wikipedia articles converted to Markdown and organised into notebooks, as well as an example todo list, in order to test and demonstrate the application. The demo application and its settings will be installed in a separate directory so as not to interfere with any existing Joplin application.

	npm install -g demo-joplin

To start it, type `demo-joplin`.

# Features

- Mobile and command line applications.
- Support notes, todos, tags and notebooks.
- Offline first, so the entire data is always available on the device.
- Ability to synchronise with multiple targets, including the file system and OneDrive (Dropbox is planned).
- Synchronises to a plain text format, which can be easily manipulated, backed up, or exported to a different format.
- Plain text notes, which are rendered as markdown in the mobile application.
- Tag support
- File attachment support (likewise, all file attachements can be imported from Evernote but currently cannot be manually added to a note)
- Search functionality.
- Geolocation support.
- Supports multiple languages.

# Usage

To start the application type `joplin`. This will open the user interface, which has three main panes: Notebooks, Notes and the text of the current note. There are also additional panels that can be toggled on and off via shortcuts (see shortcuts below).

## Input modes

Joplin user interface is partly based on vim and offers two different modes to interact with the notes and notebooks:

### Normal mode

Allows moving from one pane to another using the `Tab` and `Shift-Tab` keys, and to select/view notes. Press `Enter` to edit a note. Various other [shortcuts](#available-shortcuts) are available.

### Command-line mode

Press `:` to enter command line mode. From there, the Joplin comands such as `mknote` or `search` are available. See the [full list of commands](#available-commands).

It is possible to refer to a note or notebook by title or ID. However the simplest way is to refer to the currently selected item using one of these shortcuts:

Shortcut | Description
---------|------------
`$n`     | Refers to the currently selected note
`$b`     | Refers to the currently selected notebook
`$c`     | Refers to the currently selected item. For example, if the note list is current active, `$c` will refer to the currently selected note.

**Examples:**

Create a new note with title "Wednesday's meeting":

	mknote "Wednesday's meeting"

Create a new todo:

	mktodo "Buy bread"

Move the currently selected note ($n) to the notebook with title "Personal"

	mv $n "Personal"

Rename the currently selected notebook ($b) to "Something":

	ren $b "Something"

Attach a local file to the currently selected note ($n):

	ren $n /home/laurent/pictures/Vacation12.jpg

The configuration can also be changed from command-line. For example, to change the current editor to Sublime Text:

	config editor "subl -w"

## Getting help

The complete usage information is available from command-line mode, by typing one of these commands:

Command | Description
--------|-------------------
`help`  | General help information
`help shortcuts` | Lists the available shortcuts
`help [command]` | Displays information about a particular command

If the help is not fully visible, press `Tab` multiple times till the console is in focus and use the arrow keys or page up/down to scroll the text.

## Editing a note

To edit a note, select it and press `ENTER`. Or, in command-line, mode type `edit $n` to edit the currently selected note, or `edit "Note title"` to edit a particular note.

# Importing notes from Evernote

Joplin was designed as a replacement for Evernote and so can import complete Evernote notebooks, as well as notes, tags, resources (attached files) and note metadata (such as author, geo-location, etc.). In terms of data, the only two things that might slightly differ are:

- "Regocntion" data - Evernote images, in particular scanned (or photographied) documents have "recognition" data associated with them. It is the text that Evernote has been able to recognise in the document. This data is not preserved when the note are imported into Joplin. However, should it become supported in the search tool or other parts of Joplin, it should be possible to regenerate this recognition data since the actual image would still be available.

- Colour and font sizes and faces - Evernote text is stored as HTML and this is converted to Markdown during the import process. For notes that are mostly plain text or with basic formatting (bold, italic, bullet points, links, etc.) this is a lossless conversion, and the note, once rendered back to HTML should be very similar. Tables are also imported and converted to Markdown tables. For very complex notes, some formatting data might be loss - in particular colours, font sizes and font faces will not be imported. The text itself however is always imported in full regardless of formatting.

HOW TO IMPORT A NOTEBOOK - Tutorial that shows how to export from Evernote client, then command to import in Joplin

# Synchronization

INFO ABOUT SYNC

# Android client

LINK TO ANDROID CLIENT

# URLs

By pressing Ctrl+Click on a URL, most terminals will open that URL in the default browser. However, one issue especially with long URLs is that they can end up like this:

![Cut URL in terminal](https://github.com/laurent22/joplin/blob/master/docs/images/UrlCut.png)

Not only it makes the text hard to read, but the link, being cut in two, will also not be clickable.

As a solution Joplin tries to start a mini-server in the background and, if successful, all the links will be converted to a much shorter, local URL:

![Converted URL in terminal](https://github.com/laurent22/joplin/blob/master/docs/images/UrlNoCut.png)

With this it means that not only the text will be more readable but links are also unlikely to be cut. Note that both resources (files that are attached to notes) and external links are handled in this way.

# Attachments / Resources

In Markdown links to resources are respresented as a simple ID to the resource. In order to give access to these resources, they will be, like links, converted to local URL. Clicking this link will then open a browser, which will handle the file - i.e. display the image, open the PDF file, etc.

# Localisation

The applications is currently available in English and French. If you would like to contribute a translation it is quite straightforward, please follow these steps:

- Download Poedit, the translation editor, and install it: https://poedit.net/
- Download the file to be translated: https://raw.githubusercontent.com/laurent22/joplin/master/CliClient/locales/joplin.pot
- In Poedit, open this .pot file, go into the Catalog menu and click Configuration. Change "Country" and "Language" to your own country and language.
- From then you can translate the file. Once it's done, please send the file to [this address](https://raw.githubusercontent.com/laurent22/joplin/master/Assets/Adresse.png).

# Available shortcuts

There are two types of shortcuts: those that manipulate the user interface directly, such as TAB to move from one widget to another, and those that are simply shortcuts to actual commands. In a way similar to Vim, these commands are generally a verb followed by an object. For example, typing `mn` ([m]ake [n]ote), is used to create a new note, it will switch the interface to command line mode and pre-fill it with `mknote ""` from where the title of the note can be entered.

*List of shortcuts:*

	Tab       Give focus to next widget
	Shift+Tab Give focus to previous widget
	:         Enter command line mode
	ESC       Exit command line mode
	Ctrl+C    Cancel the current command.
	Ctrl+D    Exit the application.
	DELETE    Delete the currently selected note or notebook.
	SPACE     Set a todo as completed / not completed
	tc        [t]oggle [c]onsole between maximized/minimized/hidden/visible.
	tm        [t]oggle note [m]etadata.
	mn        [m]ake a new [n]ote
	mt        [m]ake a new [t]odo
	mb        [m]ake a new note[b]ook
	yn        Copy ([y]ank) the [n]ote to a notebook.
	dn        Move the note to a notebook.

# Available commands

The following commands are available in [command-line mode](#command-line-mode):

	attach <note> <file>

	    Attaches the given file to the note.

	config [name] [value]

	    Gets or sets a config value. If [value] is not provided, it will show the 
	    value of [name]. If neither [name] nor [value] is provided, it will list 
	    the current configuration.

	    -v, --verbose  Also displays unset and hidden config variables.

	Possible keys/values:

	    editor                 Text editor.
	                           The editor that will be used to open a note. If 
	                           none is provided it will try to auto-detect the 
	                           default editor.
	                           Type: string.
	                           
	    locale                 Language.
	                           Type: Enum.
	                           Possible values: en_GB (English), fr_FR (Français).
	                           Default: "en_GB"
	                           
	    sync.2.path            File system synchronisation target directory.
	                           The path to synchronise with when file system 
	                           synchronisation is enabled. See `sync.target`.
	                           Type: string.
	                           
	    sync.interval          Synchronisation interval.
	                           Type: Enum.
	                           Possible values: 0 (Disabled), 300 (5 minutes), 600 
	                           (10 minutes), 1800 (30 minutes), 3600 (1 hour), 
	                           43200 (12 hours), 86400 (24 hours).
	                           Default: 300
	                           
	    sync.target            Synchronisation target.
	                           The target to synchonise to. If synchronising with 
	                           the file system, set `sync.2.path` to specify the 
	                           target directory.
	                           Type: Enum.
	                           Possible values: 1 (Memory), 2 (File system), 3 
	                           (OneDrive).
	                           Default: 3
	                           
	    trackLocation          Save geo-location with notes.
	                           Type: bool.
	                           Default: true
	                           
	    uncompletedTodosOnTop  Show uncompleted todos on top of the lists.
	                           Type: bool.
	                           Default: true

	cp <note> [notebook]

	    Duplicates the notes matching <note> to [notebook]. If no notebook is 
	    specified the note is duplicated in the current notebook.

	done <note>

	    Marks a todo as done.

	edit <note>

	    Edit note.

	exit

	    Exits the application.

	export <destination>

	    Exports Joplin data to the given target.

	    --note <note>          Exports only the given note.
	    --notebook <notebook>  Exports only the given notebook.

	geoloc <note>

	    Displays a geolocation URL for the note.

	help [command]

	    Displays usage information.

	import-enex <file> [notebook]

	    Imports an Evernote notebook file (.enex file).

	    -f, --force  Do not ask for confirmation.

	mkbook <new-notebook>

	    Creates a new notebook.

	mknote <new-note>

	    Creates a new note.

	mktodo <new-todo>

	    Creates a new todo.

	mv <note> [notebook]

	    Moves the notes matching <note> to [notebook].

	ren <item> <name>

	    Renames the given <item> (note or notebook) to <name>.

	rmbook <notebook>

	    Deletes the given notebook.

	    -f, --force  Deletes the notebook without asking for confirmation.

	rmnote <note-pattern>

	    Deletes the notes matching <note-pattern>.

	    -f, --force  Deletes the notes without asking for confirmation.

	search <pattern> [notebook]

	    Searches for the given <pattern> in all the notes.

	status

	    Displays summary about the notes and notebooks.

	sync

	    Synchronises with remote storage.

	    --target <target>  Sync to provided target (defaults to sync.target config 
	                       value)

	tag <tag-command> [tag] [note]

	    <tag-command> can be "add", "remove" or "list" to assign or remove [tag] 
	    from [note], or to list the notes associated with [tag]. The command `tag 
	    list` can be used to list all the tags.

	todo <todo-command> <note-pattern>

	    <todo-command> can either be "toggle" or "clear". Use "toggle" to toggle 
	    the given todo between completed and uncompleted state (If the target is a 
	    regular note it will be converted to a todo). Use "clear" to convert the 
	    todo back to a regular note.

	undone <note>

	    Marks a todo as non-completed.

	version

	    Displays version information

# License

Copyright (c) 2016-2017 Laurent Cozic

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.