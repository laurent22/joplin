# Joplin

Joplin is a free, open source note taking and to-do application, which can handle a large number of notes organised into notebooks. The notes are searchable, can be copied, tagged and modified with your own text editor.

Notes exported from Evernote via .enex files [can be imported](#importing-notes-from-evernote) into Joplin, including the formatted content (which is converted to markdown), resources (images, attachments, etc.) and complete metadata (geolocation, updated time, created time, etc.).

The notes can be [synchronised](#synchronisation) with various targets including the file system (for example with a network directory) or with Microsoft OneDrive. When synchronising the notes, notebooks, tags and other metadata are saved to plain text files which can be easily inspected, backed up and moved around.

Joplin is still under development but is out of Beta and should be suitable for every day use. The UI of the terminal client is built on top of the great [terminal-kit](https://github.com/cronvel/terminal-kit) library, the desktop client using [Electron](https://electronjs.org/), and the Android client front end is done using [React Native](https://facebook.github.io/react-native/).

<div class="top-screenshot"><img src="https://raw.githubusercontent.com/laurent22/joplin/master/docs/images/AllClients.jpg" style="max-width: 100%; max-height: 35em;"></div>

# Installation

Three types of applications are available: **desktop** (Windows, macOS and Linux), **mobile** (Android and iOS) and for **terminal** (Windows, macOS and Linux). All applications have similar user interfaces and can synchronise with each others.

## Desktop applications

Operating System | Download
-----------------|--------
Windows          | <a href='https://github.com/laurent22/joplin/releases/download/v0.10.22/Joplin-Setup-0.10.22.exe'><img alt='Get it on Windows' height="40px" src='https://raw.githubusercontent.com/laurent22/joplin/master/docs/images/BadgeWindows.png'/></a>
macOS          | <a href='https://github.com/laurent22/joplin/releases/download/v0.10.22/Joplin-0.10.22.dmg'><img alt='Get it on macOS' height="40px" src='https://raw.githubusercontent.com/laurent22/joplin/master/docs/images/BadgeMacOS.png'/></a>
Linux          | <a href='https://github.com/laurent22/joplin/releases/download/v0.10.22/Joplin-0.10.22-x86_64.AppImage'><img alt='Get it on macOS' height="40px" src='https://raw.githubusercontent.com/laurent22/joplin/master/docs/images/BadgeLinux.png'/></a>

## Mobile applications

Operating System | Download
-----------------|--------
Android          | <a href='https://play.google.com/store/apps/details?id=net.cozic.joplin&utm_source=GitHub&utm_campaign=README&pcampaignid=MKT-Other-global-all-co-prtnr-py-PartBadge-Mar2515-1'><img alt='Get it on Google Play' height="40px" src='https://raw.githubusercontent.com/laurent22/joplin/master/docs/images/BadgeAndroid.png'/></a>
iOS              | <a href='https://itunes.apple.com/us/app/joplin/id1315599797'><img alt='Get it on the App Store' height="40px" src='https://raw.githubusercontent.com/laurent22/joplin/master/docs/images/BadgeIOS.png'/></a>

## Terminal application

On macOS, Linux or Windows (via [WSL](https://msdn.microsoft.com/en-us/commandline/wsl/faq?f=255&MSPPError=-2147217396)), type:

	npm install -g joplin

To start it, type `joplin`.

For usage information, please refer to the full [Joplin Terminal Application Documentation](http://joplin.cozic.net/terminal).

# Features 

- Desktop, mobile and terminal applications.
- Support notes, to-dos, tags and notebooks.
- Offline first, so the entire data is always available on the device even without an internet connection.
- Ability to synchronise with multiple targets, including the file system and OneDrive (Dropbox is planned).
- Synchronises to a plain text format, which can be easily manipulated, backed up, or exported to a different format.
- Plain text notes, which are rendered as markdown in the mobile and desktop application.
- Tag support
- File attachment support (images are displayed, and other files are linked and can be opened in the relevant application).
- Search functionality.
- Geo-location support.
- Supports multiple languages

# Importing notes from Evernote

Joplin was designed as a replacement for Evernote and so can import complete Evernote notebooks, as well as notes, tags, resources (attached files) and note metadata (such as author, geo-location, etc.) via ENEX files. In terms of data, the only two things that might slightly differ are:

- Recognition data - Evernote images, in particular scanned (or photographed) documents have [recognition data](https://en.wikipedia.org/wiki/Optical_character_recognition) associated with them. It is the text that Evernote has been able to recognise in the document. This data is not preserved when the note are imported into Joplin. However, should it become supported in the search tool or other parts of Joplin, it should be possible to regenerate this recognition data since the actual image would still be available.

- Colour, font sizes and faces - Evernote text is stored as HTML and this is converted to Markdown during the import process. For notes that are mostly plain text or with basic formatting (bold, italic, bullet points, links, etc.) this is a lossless conversion, and the note, once rendered back to HTML should be very similar. Tables are also imported and converted to Markdown tables. For very complex notes, some formatting data might be loss - in particular colours, font sizes and font faces will not be imported. The text itself however is always imported in full regardless of formatting.

To import Evernote data, follow these steps:

## Desktop application

* Open the "File" menu and click "Import Evernote notes"

This will open a new screen which will display the import progress. The notes will be imported into a new separate notebook (so that, in case of a mistake, the notes are not mixed up with any existing notes). If needed then can then be moved to a different notebook, or the notebook can be renamed, etc.

## Terminal application

* First, export your Evernote notebooks to ENEX files as described [here](https://help.evernote.com/hc/en-us/articles/209005557-How-to-back-up-export-and-restore-import-notes-and-notebooks).
* In Joplin, in [command-line mode](/terminal#command-line-mode), type `import-enex /path/to/file.enex`. This will import the notes into a new notebook named after the filename.
* Then repeat the process for each notebook that needs to be imported.

# Synchronisation

One of the goals of Joplin was to avoid being tied to any particular company or service, whether it is Evernote, Google or Microsoft. As such the synchronisation is designed without any hard dependency to any particular service. Most of the synchronisation process is done at an abstract level and access to external services, such as OneDrive or Dropbox, is done via lightweight drivers. It is easy to support new services by creating simple drivers that provide a filesystem-like interface, i.e. the ability to read, write, delete and list items. It is also simple to switch from one service to another or to even sync to multiple services at once. Each note, notebook, tags, as well as the relation between items is transmitted as plain text files during synchronisation, which means the data can also be moved to a different application, can be easily backed up, inspected, etc.

Currently, synchronisation is possible with OneDrive (by default) or the local filesystem. A Dropbox driver will also be available once [this React Native bug](https://github.com/facebook/react-native/issues/14445) is fixed. When syncing with OneDrive, Joplin creates a sub-directory in OneDrive, in /Apps/Joplin and read/write the notes and notebooks from it. The application does not have access to anything outside this directory.

## Desktop application

To initiate the synchronisation process, click on the "Synchronise" button in the sidebar. You will be asked to login to OneDrive to authorise the application (simply input your Microsoft credentials - you do not need to register with OneDrive). After that, the application will synchronise in the background whenever it is running, or you can click on "Synchronise" to start a synchronisation manually

## Terminal application

To initiate the synchronisation process, type `:sync`. You will be asked to follow a link to authorise the application (simply input your Microsoft credentials - you do not need to register with OneDrive). After that, the application will synchronise in the background whenever it is running. It is possible to also synchronise outside of the user interface by typing `joplin sync` from the terminal. This can be used to setup a cron script to synchronise at regular interval. For example, this would do it every 30 minutes:

	*/30 * * * * /path/to/joplin sync

# Attachments / Resources

Any kind of file can be attached to a note. In Markdown, links to these files are represented as a simple ID to the resource. In the note viewer, these files, if they are images, will be displayed or, if they are other files (PDF, text files, etc.) they will be displayed as links. Clicking on this link will open the file in the default application.

# Localisation

Joplin is currently available in English and French. If you would like to contribute a translation, it is quite straightforward, please follow these steps:

- [Download Poedit](https://poedit.net/), the translation editor, and install it.
- [Download the file to be translated](https://raw.githubusercontent.com/laurent22/joplin/master/CliClient/locales/joplin.pot).
- In Poedit, open this .pot file, go into the Catalog menu and click Configuration. Change "Country" and "Language" to your own country and language.
- From then you can translate the file. Once it's done, please send the file to [this address](https://raw.githubusercontent.com/laurent22/joplin/master/Assets/Adresse.png) or open a pull request.

This translation will apply to both the terminal and the Android application.

# Coming features

- All: End to end encryption
- Windows: Tray icon
- Desktop apps: Tag auto-complete
- Desktop apps: Dark theme
- Linux: Enable auto-update for desktop app

# Known bugs

- Non-alphabetical characters such as Chinese or Arabic might create glitches in the terminal on Windows. This is a limitation of the current Windows console.
- Auto-update is not working in the Linux desktop application.

# License

Copyright (c) 2016-2017 Laurent Cozic

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
