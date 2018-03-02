# Joplin

Joplin is a free, open source note taking and to-do application, which can handle a large number of notes organised into notebooks. The notes are searchable, can be copied, tagged and modified either from the applications directly or from your own text editor. The notes are in [Markdown format](https://daringfireball.net/projects/markdown/basics).

Notes exported from Evernote via .enex files [can be imported](#importing) into Joplin, including the formatted content (which is converted to Markdown), resources (images, attachments, etc.) and complete metadata (geolocation, updated time, created time, etc.). Plain Markdown files can also be imported.

The notes can be [synchronised](#synchronisation) with various targets including [Nextcloud](https://nextcloud.com/), the file system (for example with a network directory) or with Microsoft OneDrive. When synchronising the notes, notebooks, tags and other metadata are saved to plain text files which can be easily inspected, backed up and moved around.

The UI of the terminal client is built on top of the great [terminal-kit](https://github.com/cronvel/terminal-kit) library, the desktop client using [Electron](https://electronjs.org/), and the Android client front end is done using [React Native](https://facebook.github.io/react-native/).

<div class="top-screenshot"><img src="https://raw.githubusercontent.com/laurent22/joplin/master/docs/images/AllClients.jpg" style="max-width: 100%; max-height: 35em;"></div>

# Installation

Three types of applications are available: for the **desktop** (Windows, macOS and Linux), for **mobile** (Android and iOS) and for **terminal** (Windows, macOS and Linux). All applications have similar user interfaces and can synchronise with each others.

## Desktop applications

Operating System | Download
-----------------|--------
Windows          | <a href='https://github.com/laurent22/joplin/releases/download/v1.0.70/Joplin-Setup-1.0.70.exe'><img alt='Get it on Windows' height="40px" src='https://raw.githubusercontent.com/laurent22/joplin/master/docs/images/BadgeWindows.png'/></a>
macOS          | <a href='https://github.com/laurent22/joplin/releases/download/v1.0.70/Joplin-1.0.70.dmg'><img alt='Get it on macOS' height="40px" src='https://raw.githubusercontent.com/laurent22/joplin/master/docs/images/BadgeMacOS.png'/></a>
Linux          | <a href='https://github.com/laurent22/joplin/releases/download/v1.0.70/Joplin-1.0.70-x86_64.AppImage'><img alt='Get it on macOS' height="40px" src='https://raw.githubusercontent.com/laurent22/joplin/master/docs/images/BadgeLinux.png'/></a>

## Mobile applications

Operating System | Download | Alt. Download
-----------------|----------|----------------
Android          | <a href='https://play.google.com/store/apps/details?id=net.cozic.joplin&utm_source=GitHub&utm_campaign=README&pcampaignid=MKT-Other-global-all-co-prtnr-py-PartBadge-Mar2515-1'><img alt='Get it on Google Play' height="40px" src='https://raw.githubusercontent.com/laurent22/joplin/master/docs/images/BadgeAndroid.png'/></a> | or [Download APK File](https://github.com/laurent22/joplin-android/releases/download/android-v1.0.103/joplin-v1.0.103.apk)
iOS              | <a href='https://itunes.apple.com/us/app/joplin/id1315599797'><img alt='Get it on the App Store' height="40px" src='https://raw.githubusercontent.com/laurent22/joplin/master/docs/images/BadgeIOS.png'/></a> | -

## Terminal application

On macOS:

	brew install joplin

On Linux or Windows (via [WSL](https://msdn.microsoft.com/en-us/commandline/wsl/faq?f=255&MSPPError=-2147217396)):

**Important:** First, [install Node 8+](https://nodejs.org/en/download/package-manager/). Node 8 is LTS but not yet available everywhere so you might need to manually install it.

	NPM_CONFIG_PREFIX=~/.joplin-bin npm install -g joplin
	sudo ln -s ~/.joplin-bin/bin/joplin /usr/bin/joplin

By default, the application binary will be installed under `~/.joplin-bin`. You may change this directory if needed. Alternatively, if your npm permissions are setup as described [here](https://docs.npmjs.com/getting-started/fixing-npm-permissions#option-2-change-npms-default-directory-to-another-directory) (Option 2) then simply running `npm -g install joplin` would work.

To start it, type `joplin`.

For usage information, please refer to the full [Joplin Terminal Application Documentation](http://joplin.cozic.net/terminal).

# Features 

- Desktop, mobile and terminal applications.
- End To End Encryption (E2EE)
- Synchronisation with various services, including NextCloud, WebDAV and OneDrive. Dropbox is planned.
- Import Enex files (Evernote export format) and Markdown files.
- Export JEX files (Joplin Export format) and raw files.
- Support notes, to-dos, tags and notebooks.
- Sort notes by multiple criteria - title, updated time, etc.
- Support for alarms (notifications) in mobile and desktop applications.
- Offline first, so the entire data is always available on the device even without an internet connection.
- Markdown notes, which are rendered with images and formatting in the desktop and mobile applications. Support for extra features such as math notation and checkboxes.
- File attachment support - images are displayed, and other files are linked and can be opened in the relevant application.
- Search functionality.
- Geo-location support.
- Supports multiple languages

# Importing

## Importing from Evernote 

Joplin was designed as a replacement for Evernote and so can import complete Evernote notebooks, as well as notes, tags, resources (attached files) and note metadata (such as author, geo-location, etc.) via ENEX files. In terms of data, the only two things that might slightly differ are:

- Recognition data - Evernote images, in particular scanned (or photographed) documents have [recognition data](https://en.wikipedia.org/wiki/Optical_character_recognition) associated with them. It is the text that Evernote has been able to recognise in the document. This data is not preserved when the note are imported into Joplin. However, should it become supported in the search tool or other parts of Joplin, it should be possible to regenerate this recognition data since the actual image would still be available.

- Colour, font sizes and faces - Evernote text is stored as HTML and this is converted to Markdown during the import process. For notes that are mostly plain text or with basic formatting (bold, italic, bullet points, links, etc.) this is a lossless conversion, and the note, once rendered back to HTML should be very similar. Tables are also imported and converted to Markdown tables. For very complex notes, some formatting data might be lost - in particular colours, font sizes and font faces will not be imported. The text itself however is always imported in full regardless of formatting.

To import Evernote data, first export your Evernote notebooks to ENEX files as described [here](https://help.evernote.com/hc/en-us/articles/209005557-How-to-back-up-export-and-restore-import-notes-and-notebooks). Then follow these steps:

On the **desktop application**, open File > Import > ENEX and select your file. The notes will be imported into a new separate notebook. If needed they can then be moved to a different notebook, or the notebook can be renamed, etc.

On the **terminal application**, in [command-line mode](/terminal#command-line-mode), type `import /path/to/file.enex`. This will import the notes into a new notebook named after the filename.

## Importing from Markdown files

Joplin can import notes from plain Markdown file. You can either import a complete directory of Markdown files or individual files.

On the **desktop application**, open File > Import > MD and select your Markdown file or directory.

On the **terminal application**, in [command-line mode](/terminal#command-line-mode), type `import --format md /path/to/file.md` or `import --format md /path/to/directory/`.

## Importing from other applications

In general the way to import notes from any application into Joplin is to convert the notes to ENEX files (Evernote format) and to import these ENEX files into Joplin using the method above. Most note-taking applications support ENEX files so it should be relatively straightforward. For help about specific applications, see below:

* Standard Notes: Please see [this tutorial](https://programadorwebvalencia.com/migrate-notes-from-standard-notes-to-joplin/)
* Tomboy Notes: Export the notes to ENEX files [as described here](https://askubuntu.com/questions/243691/how-can-i-export-my-tomboy-notes-into-evernote/608551) for example, and import these ENEX files into Joplin.

# Exporting

Joplin can export to the JEX format (Joplin Export file), which is a tar file that can contain multiple notes, notebooks, etc. This is a lossless format in that all the notes, but also metadata such as geo-location, updated time, tags, etc. are preserved. This format is convenient for backup purposes and can be re-imported into Joplin. A "raw" format is also available. This is the same as the JEX format except that the data is saved to a directory and each item represented by a single file.

# Synchronisation

One of the goals of Joplin was to avoid being tied to any particular company or service, whether it is Evernote, Google or Microsoft. As such the synchronisation is designed without any hard dependency to any particular service. Most of the synchronisation process is done at an abstract level and access to external services, such as Nextcloud or OneDrive, is done via lightweight drivers. It is easy to support new services by creating simple drivers that provide a filesystem-like interface, i.e. the ability to read, write, delete and list items. It is also simple to switch from one service to another or to even sync to multiple services at once. Each note, notebook, tags, as well as the relation between items is transmitted as plain text files during synchronisation, which means the data can also be moved to a different application, can be easily backed up, inspected, etc.

Currently, synchronisation is possible with Nextcloud and OneDrive (by default) or the local filesystem. A Dropbox one will also be available once [this React Native bug](https://github.com/facebook/react-native/issues/14445) is fixed. To setup synchronisation please follow the instructions below. After that, the application will synchronise in the background whenever it is running, or you can click on "Synchronise" to start a synchronisation manually.

## Nextcloud synchronisation

On the **desktop application** or **mobile application**, go to the config screen and select Nextcloud as the synchronisation target. Then input [the WebDAV URL](https://docs.nextcloud.com/server/9/user_manual/files/access_webdav.html), this is normally `https://example.com/nextcloud/remote.php/dav/files/USERNAME/Joplin` (make sure to create the "Joplin" directory in Nextcloud and to replace USERNAME by your Nextcloud username), and set the username and password.

On the **terminal application**, you will need to set the `sync.target` config variable and all the `sync.5.path`, `sync.5.username` and `sync.5.password` config variables to, respectively the Nextcloud WebDAV URL, your username and your password. This can be done from the command line mode using:

    :config sync.5.path https://example.com/nextcloud/remote.php/dav/files/USERNAME/Joplin
    :config sync.5.username YOUR_USERNAME
    :config sync.5.password YOUR_PASSWORD
	:config sync.target 5

If synchronisation does not work, please consult the logs in the app profile directory - it is often due to a misconfigured URL or password. The log should indicate what the exact issue is.

## WebDAV synchronisation

Select the "WebDAV" synchronisation target and follow the same instructions as for Nextcloud above.

WebDAV-compatible services that are known to work with Joplin:

- [Box.com](https://www.box.com/)
- [DriveHQ](https://www.drivehq.com)
- [OwnCloud](https://owncloud.org/)
- [Seafile](https://www.seafile.com/)
- [Stack](https://www.transip.nl/stack/)
- [Zimbra](https://www.zimbra.com/)

## OneDrive synchronisation

When syncing with OneDrive, Joplin creates a sub-directory in OneDrive, in /Apps/Joplin and read/write the notes and notebooks from it. The application does not have access to anything outside this directory.

On the **desktop application** or **mobile application**, select "OneDrive" as the synchronisation target in the config screen (it is selected by default). Then, to initiate the synchronisation process, click on the "Synchronise" button in the sidebar. You will be asked to login to OneDrive to authorise the application (simply input your Microsoft credentials - you do not need to register with OneDrive).

On the **terminal application**, to initiate the synchronisation process, type `:sync`. You will be asked to follow a link to authorise the application (simply input your Microsoft credentials - you do not need to register with OneDrive). It is possible to also synchronise outside of the user interface by typing `joplin sync` from the terminal. This can be used to setup a cron script to synchronise at regular interval. For example, this would do it every 30 minutes:

	*/30 * * * * /path/to/joplin sync

# Encryption

Joplin supports end-to-end encryption (E2EE) on all the applications. E2EE is a system where only the owner of the notes, notebooks, tags or resources can read them. It prevents potential eavesdroppers - including telecom providers, internet providers, and even the developers of Joplin from being able to access the data. Please see the [End-To-End Encryption Tutorial](http://joplin.cozic.net/help/e2ee) for more information about this feature and how to enable it.

For a more technical description, mostly relevant for development or to review the method being used, please see the [Encryption specification](http://joplin.cozic.net/help/spec).

# Attachments / Resources

Any kind of file can be attached to a note. In Markdown, links to these files are represented as a simple ID to the resource. In the note viewer, these files, if they are images, will be displayed or, if they are other files (PDF, text files, etc.) they will be displayed as links. Clicking on this link will open the file in the default application.

# Notifications

On the desktop and mobile apps, an alarm can be associated with any to-do. It will be triggered at the given time by displaying a notification. How the notification will be displayed depends on the operating system since each has a different way to handle this. Please see below for the requirements for the desktop applications:

- **Windows**: >= 8. Make sure the Action Center is enabled on Windows. Task bar balloon for Windows < 8. Growl as fallback. Growl takes precedence over Windows balloons.
- **macOS**: >= 10.8 or Growl if earlier.
- **Linux**: `notify-osd` or `libnotify-bin` installed (Ubuntu should have this by default). Growl otherwise

See [documentation and flow chart for reporter choice](https://github.com/mikaelbr/node-notifier/blob/master/DECISION_FLOW.md)

On mobile, the alarms will be displayed using the built-in notification system.

If for any reason the notifications do not work, please [open an issue](https://github.com/laurent22/joplin/issues).

# Markdown

Joplin uses and renders [Github-flavoured Markdown](https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet) with a few variations and additions. In particular:

## Math notation

Math expressions can be added using the [Katex notation](https://khan.github.io/KaTeX/). To add an inline equation, wrap the expression in `$EXPRESSION$`, eg. `$\sqrt{3x-1}+(1+x)^2$`. To create an expression block, wrap it as follow:

    $$
    EXPRESSION
    $$

For example:

    $$
    f(x) = \int_{-\infty}^\infty
        \hat f(\xi)\,e^{2 \pi i \xi x}
        \,d\xi
    $$

Here is an example with the Markdown and rendered result side by side:

<img src="https://raw.githubusercontent.com/laurent22/joplin/master/docs/images/Katex.png" style="max-width: 100%; max-height: 35em;">

## Checkboxes

Checkboxes can be added like so:

    - [ ] Milk
    - [ ] Rice
    - [ ] Eggs

The checkboxes can then be ticked in the mobile and desktop applications.

# Contributing

Please see the guide for information on how to contribute to the development of Joplin: https://github.com/laurent22/joplin/blob/master/CONTRIBUTING.md

# Localisation

Joplin is currently available in the languages below. If you would like to contribute a **new translation**, it is quite straightforward, please follow these steps:

- [Download Poedit](https://poedit.net/), the translation editor, and install it.
- [Download the file to be translated](https://raw.githubusercontent.com/laurent22/joplin/master/CliClient/locales/joplin.pot).
- In Poedit, open this .pot file, go into the Catalog menu and click Configuration. Change "Country" and "Language" to your own country and language.
- From then you can translate the file. Once it is done, please either [open a pull request](https://github.com/laurent22/joplin/pulls) or send the file to [this address](https://raw.githubusercontent.com/laurent22/joplin/master/Assets/Adresse.png).

This translation will apply to the three applications - desktop, mobile and terminal.

To **update a translation**, follow the same steps as above but instead of getting the .pot file, get the .po file for your language from the table below.

Current translations:

<!-- LOCALE-TABLE-AUTO-GENERATED -->
&nbsp;  |  Language  |  Po File  |  Last translator  |  Percent done
---|---|---|---|---
![](https://raw.githubusercontent.com/stevenrskelton/flag-icon/master/png/16/es/basque_country.png)  |  Basque  |  [eu](https://github.com/laurent22/joplin/blob/master/CliClient/locales/eu.po)  |  juan.abasolo@ehu.eus  |  81%
![](https://raw.githubusercontent.com/stevenrskelton/flag-icon/master/png/16/country-4x3/hr.png)  |  Croatian  |  [hr_HR](https://github.com/laurent22/joplin/blob/master/CliClient/locales/hr_HR.po)  |  Hrvoje Mandić <trbuhom@net.hr>  |  66%
![](https://raw.githubusercontent.com/stevenrskelton/flag-icon/master/png/16/country-4x3/de.png)  |  Deutsch  |  [de_DE](https://github.com/laurent22/joplin/blob/master/CliClient/locales/de_DE.po)  |  Tobias Strobel <git@strobeltobias.de>  |  83%
![](https://raw.githubusercontent.com/stevenrskelton/flag-icon/master/png/16/country-4x3/gb.png)  |  English  |  [en_GB](https://github.com/laurent22/joplin/blob/master/CliClient/locales/en_GB.po)  |    |  100%
![](https://raw.githubusercontent.com/stevenrskelton/flag-icon/master/png/16/country-4x3/es.png)  |  Español  |  [es_ES](https://github.com/laurent22/joplin/blob/master/CliClient/locales/es_ES.po)  |  Fernando Martín <f@mrtn.es>  |  93%
![](https://raw.githubusercontent.com/stevenrskelton/flag-icon/master/png/16/country-4x3/fr.png)  |  Français  |  [fr_FR](https://github.com/laurent22/joplin/blob/master/CliClient/locales/fr_FR.po)  |  Laurent Cozic  |  100%
![](https://raw.githubusercontent.com/stevenrskelton/flag-icon/master/png/16/country-4x3/it.png)  |  Italiano  |  [it_IT](https://github.com/laurent22/joplin/blob/master/CliClient/locales/it_IT.po)  |    |  68%
![](https://raw.githubusercontent.com/stevenrskelton/flag-icon/master/png/16/country-4x3/be.png)  |  Nederlands  |  [nl_BE](https://github.com/laurent22/joplin/blob/master/CliClient/locales/nl_BE.po)  |    |  82%
![](https://raw.githubusercontent.com/stevenrskelton/flag-icon/master/png/16/country-4x3/br.png)  |  Português (Brasil)  |  [pt_BR](https://github.com/laurent22/joplin/blob/master/CliClient/locales/pt_BR.po)  |    |  66%
![](https://raw.githubusercontent.com/stevenrskelton/flag-icon/master/png/16/country-4x3/ru.png)  |  Русский  |  [ru_RU](https://github.com/laurent22/joplin/blob/master/CliClient/locales/ru_RU.po)  |  Artyom Karlov <artyom.karlov@gmail.com>  |  85%
![](https://raw.githubusercontent.com/stevenrskelton/flag-icon/master/png/16/country-4x3/cn.png)  |  中文 (简体)  |  [zh_CN](https://github.com/laurent22/joplin/blob/master/CliClient/locales/zh_CN.po)  |  RCJacH <RCJacH@outlook.com>  |  68%
![](https://raw.githubusercontent.com/stevenrskelton/flag-icon/master/png/16/country-4x3/jp.png)  |  日本語  |  [ja_JP](https://github.com/laurent22/joplin/blob/master/CliClient/locales/ja_JP.po)  |    |  66%
<!-- LOCALE-TABLE-AUTO-GENERATED -->

# Known bugs

- Non-alphabetical characters such as Chinese or Arabic might create glitches in the terminal on Windows. This is a limitation of the current Windows console.
- While the mobile can sync and load tags, it is not currently possible to create new ones. The desktop and terminal apps can create, delete and edit tags.

# License

Copyright (c) 2016-2018 Laurent Cozic

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
