# Installation

	npm install -g joplin

# Demo

The demo application shows various Wikipedia articles converted to Markdown and organised into notebooks in order to test and demonstrate the application. The demo application and its settings will be installed in a separate directory so as not to interfere with any existing Joplin application.

	npm install -g demo-joplin

# Features

- Mobile and command line applications.
- Support notes, todos, tags and notebooks.
- Offline first, so the entire data is always available on the device.
- Ability to synchronise with multiple targets, including the file system and OneDrive (Dropbox is planned).
- Synchronises to a plain text format, which can be easily manipulated, backed up, or exported to a different format.
- Plain text notes, which are rendered as markdown in the mobile application.
- Tag support (currently, tags can be imported from Evernote and modified in the CLI application, but not yet in the mobile one)
- File attachment support (likewise, all file attachements can be imported from Evernote but currently cannot be manually added to a note)
- Search functionality.
- Geolocation support.
- Supports multiple languages.

# Usage

To start the application type `joplin`. This will open the user interface, which has three main panes: Notebooks, Notes and the text of the current note. There are also additional panels that can be toggled on and off via shortcuts (see shortcuts below).

![](doc/images/ScreenshotTerminal.png)

## Input modes

Joplin user interface is partly based on vim and offers two different modes to interact with the notes and notebooks:

### Normal mode

Allows moving from one pane to another using the `Tab` and `Shift-Tab` keys, and to select/view notes. Press `Enter` to edit a note. Various other [shortcuts](#shortcuts) are available.

### Command-line mode

Press `:` to enter the command line mode. From there, all the Joplin comands are available such as `mknote` or `search`. See the [full list of commands](#commands).

It is possible to refer to a note or notebook by title or ID. However the simplest way is to refer to the currently selected item using one of these shortcuts:

Shortcut | Description
---------|------------
`$n`     | Refers to the currently selected note
`$b`     | Refers to the currently selected notebook
`$c`     | Refers to the currently selected item. For example, if the note list is current active, `$c` will refer to the currently selected note.

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

HOW TO EDIT A NOTE

# Available commands

PUT LIST OF COMMANDS

# Available keyboard shortcuts

There are two types of shortcuts: those that manipulate the user interface directly, such as TAB to move from one widget to another, and those that are simply shortcuts to actual commands. For example, typing `nn`, which is used to create a new note, will switch to command line mode and pre-fill it with `mknote ""` from where the title of the note can be entered.

PUT LIST OF SHORTCUT

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

One issue with rendering markdown in a terminal is that URLs often end up looking like this:

IMAGE OF WORD WRAP LINK

Not only it makes the text hard to read, but the link, being cut in two, will also not be clickable (in most terminals pressing Ctrl+Click opens the link).

As a solution Joplin tries to start a mini-server in the background and, if successful, all the links will be converted to a much shorter, local URL.

IMAGE OF CONVERTED TEXT

With this it means that not only the text will be more readable but links are also unlikely to be cut. Note that both resources (files that are attached to notes) and external links are handled in this way.

# Attachments / Resources

In Markdown links to resources are respresented as a simple ID to the resource. In order to give access to these resources, they will be, like links, converted to local URL. Clicking this link will then open a browser, which will handle the file - i.e. display the image, open the PDF file, etc.

# Localisation

The applications is currently available in English and French. If you would like to contribute a translation it is quite straightforward, please follow these steps:

- Download Poedit, the translation editor, and install it: https://poedit.net/
- Download the file to be translated: https://raw.githubusercontent.com/laurent22/joplin/master/CliClient/locales/joplin.pot
- In Poedit, open this .pot file, go into the Catalog menu and click Configuration. Change "Country" and "Language" to your own country and language.
- From then you can translate the file. Once it's done, please send the file to [this address](https://raw.githubusercontent.com/laurent22/joplin/master/Assets/Adresse.png).

# Command line mode

# License

Copyright (c) 2016-2017 Laurent Cozic

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.