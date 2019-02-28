# Joplin

[![Donate](https://joplin.cozic.net/images/badges/Donate-PayPal-green.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=E8JMYD2LQ8MMA&lc=GB&item_name=Joplin+Development&currency_code=EUR&bn=PP%2dDonationsBF%3abtn_donateCC_LG%2egif%3aNonHosted) [![Become a patron](https://joplin.cozic.net/images/badges/Patreon-Badge.svg)](https://www.patreon.com/joplin) [![Travis Build Status](https://travis-ci.org/laurent22/joplin.svg?branch=master)](https://travis-ci.org/laurent22/joplin) [![Appveyor Build Status](https://ci.appveyor.com/api/projects/status/github/laurent22/joplin?branch=master&passingText=master%20-%20OK&svg=true)](https://ci.appveyor.com/project/laurent22/joplin)

Joplin is a free, open source note taking and to-do application, which can handle a large number of notes organised into notebooks. The notes are searchable, can be copied, tagged and modified either from the applications directly or from your own text editor. The notes are in [Markdown format](#markdown).

Notes exported from Evernote via .enex files [can be imported](#importing) into Joplin, including the formatted content (which is converted to Markdown), resources (images, attachments, etc.) and complete metadata (geolocation, updated time, created time, etc.). Plain Markdown files can also be imported.

The notes can be [synchronised](#synchronisation) with various cloud services including [Nextcloud](https://nextcloud.com/), Dropbox, OneDrive, WebDAV or the file system (for example with a network directory). When synchronising the notes, notebooks, tags and other metadata are saved to plain text files which can be easily inspected, backed up and moved around.

The application is available for Windows, Linux, macOS, Android and iOS. A [Web Clipper](https://github.com/laurent22/joplin/blob/master/readme/clipper.md), to save web pages and screenshots from your browser, is also available for Firefox and Chrome.

<div class="top-screenshot"><img src="https://joplin.cozic.net/images/AllClients.jpg" style="max-width: 100%; max-height: 35em;"></div>

# Installation

Three types of applications are available: for the **desktop** (Windows, macOS and Linux), for **mobile** (Android and iOS) and for **terminal** (Windows, macOS and Linux). All applications have similar user interfaces and can synchronise with each other.

## Desktop applications

Operating System | Download | Alternative
-----------------|--------|-------------------
Windows (32 and 64-bit)         | <a href='https://github.com/laurent22/joplin/releases/download/v1.0.135/Joplin-Setup-1.0.135.exe'><img alt='Get it on Windows' height="40px" src='https://joplin.cozic.net/images/BadgeWindows.png'/></a> | or Get the <a href='https://github.com/laurent22/joplin/releases/download/v1.0.135/JoplinPortable.exe'>Portable version</a><br>(to run from a USB key, etc.)
macOS          | <a href='https://github.com/laurent22/joplin/releases/download/v1.0.135/Joplin-1.0.135.dmg'><img alt='Get it on macOS' height="40px" src='https://joplin.cozic.net/images/BadgeMacOS.png'/></a> |
Linux          | <a href='https://github.com/laurent22/joplin/releases/download/v1.0.135/Joplin-1.0.135-x86_64.AppImage'><img alt='Get it on Linux' height="40px" src='https://joplin.cozic.net/images/BadgeLinux.png'/></a> | An Arch Linux package<br>[is also available](#terminal-application).

The [portable application](https://en.wikipedia.org/wiki/Portable_application) allows installing the software on a portable device such as a USB key. Simply copy the file JoplinPortable.exe in any directory on that USB key ; the application will then create a directory called "JoplinProfile" next to the executable file.

On Linux, if it works with your distribution (it has been tested on Ubuntu, Fedora, Gnome and Mint), the recommended way is to use this script as it will handle the desktop icon too:

``` sh
wget -O - https://raw.githubusercontent.com/laurent22/joplin/master/Joplin_install_and_update.sh | bash
```

## Mobile applications

Operating System | Download | Alt. Download
-----------------|----------|----------------
Android          | <a href='https://play.google.com/store/apps/details?id=net.cozic.joplin&utm_source=GitHub&utm_campaign=README&pcampaignid=MKT-Other-global-all-co-prtnr-py-PartBadge-Mar2515-1'><img alt='Get it on Google Play' height="40px" src='https://joplin.cozic.net/images/BadgeAndroid.png'/></a> | or [Download APK File](https://github.com/laurent22/joplin-android/releases/download/android-v1.0.239/joplin-v1.0.239.apk)
iOS              | <a href='https://itunes.apple.com/us/app/joplin/id1315599797'><img alt='Get it on the App Store' height="40px" src='https://joplin.cozic.net/images/BadgeIOS.png'/></a> | -

## Terminal application

Operating system | Method
-----------------|----------------
macOS            | `brew install joplin`
Linux or Windows (via [WSL](https://msdn.microsoft.com/en-us/commandline/wsl/faq?f=255&MSPPError=-2147217396)) | **Important:** First, [install Node 8+](https://nodejs.org/en/download/package-manager/). Node 8 is LTS but not yet available everywhere so you might need to manually install it.<br/><br/>`NPM_CONFIG_PREFIX=~/.joplin-bin npm install -g joplin`<br/>`sudo ln -s ~/.joplin-bin/bin/joplin /usr/bin/joplin`<br><br>By default, the application binary will be installed under `~/.joplin-bin`. You may change this directory if needed. Alternatively, if your npm permissions are setup as described [here](https://docs.npmjs.com/getting-started/fixing-npm-permissions#option-2-change-npms-default-directory-to-another-directory) (Option 2) then simply running `npm -g install joplin` would work.
Arch Linux | An Arch Linux package is available [here](https://aur.archlinux.org/packages/joplin/). To install it, use an AUR wrapper such as yay: `yay -S joplin`. Both the CLI tool (type `joplin`) and desktop app (type `joplin-desktop`) are packaged. For support, please go to the [GitHub repo](https://github.com/masterkorp/joplin-pkgbuild).

To start it, type `joplin`.

For usage information, please refer to the full [Joplin Terminal Application Documentation](https://joplin.cozic.net/terminal).

## Web Clipper

The Web Clipper is a browser extension that allows you to save web pages and screenshots from your browser. For more information on how to install and use it, see the [Web Clipper Help Page](https://github.com/laurent22/joplin/blob/master/readme/clipper.md).

<!-- TOC -->
# Table of contents

- Applications

	- [Desktop application](https://github.com/laurent22/joplin/blob/master/readme/desktop.md)
	- [Mobile applications](https://github.com/laurent22/joplin/blob/master/readme/mobile.md)
	- [Terminal application](https://github.com/laurent22/joplin/blob/master/readme/terminal.md)
	- [Web Clipper](https://github.com/laurent22/joplin/blob/master/readme/clipper.md)

- Support

	- [Joplin Forum](https://discourse.joplin.cozic.net)
	- [How to enable end-to-end encryption](https://github.com/laurent22/joplin/blob/master/readme/e2ee.md)
	- [End-to-end encryption spec](https://github.com/laurent22/joplin/blob/master/readme/spec.md)
	- [How to enable debug mode](https://github.com/laurent22/joplin/blob/master/readme/debugging.md)
	- [API documentation](https://github.com/laurent22/joplin/blob/master/readme/api.md)
	- [FAQ](https://github.com/laurent22/joplin/blob/master/readme/faq.md)

- About

	- [Changelog](https://github.com/laurent22/joplin/blob/master/readme/changelog.md)
	- [Stats](https://github.com/laurent22/joplin/blob/master/readme/stats.md)
	- [Donate](https://github.com/laurent22/joplin/blob/master/readme/donate.md)
<!-- TOC -->

# Features

- Desktop, mobile and terminal applications.
- [Web Clipper](https://github.com/laurent22/joplin/blob/master/readme/clipper.md) for Firefox and Chrome.
- End To End Encryption (E2EE)
- Synchronisation with various services, including NextCloud, Dropbox, WebDAV and OneDrive.
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
- External editor support - open notes in your favorite external editor with one click in Joplin.

# Importing

## Importing from Evernote

Joplin was designed as a replacement for Evernote and so can import complete Evernote notebooks, as well as notes, tags, resources (attached files) and note metadata (such as author, geo-location, etc.) via ENEX files. In terms of data, the only two things that might slightly differ are:

- Recognition data - Evernote images, in particular scanned (or photographed) documents have [recognition data](https://en.wikipedia.org/wiki/Optical_character_recognition) associated with them. It is the text that Evernote has been able to recognise in the document. This data is not preserved when the note are imported into Joplin. However, should it become supported in the search tool or other parts of Joplin, it should be possible to regenerate this recognition data since the actual image would still be available.

- Colour, font sizes and faces - Evernote text is stored as HTML and this is converted to Markdown during the import process. For notes that are mostly plain text or with basic formatting (bold, italic, bullet points, links, etc.) this is a lossless conversion, and the note, once rendered back to HTML should be very similar. Tables are also imported and converted to Markdown tables. For very complex notes, some formatting data might be lost - in particular colours, font sizes and font faces will not be imported. The text itself however is always imported in full regardless of formatting.

To import Evernote data, first export your Evernote notebooks to ENEX files as described [here](https://help.evernote.com/hc/en-us/articles/209005557-How-to-back-up-export-and-restore-import-notes-and-notebooks). Then follow these steps:

On the **desktop application**, open File > Import > ENEX and select your file. The notes will be imported into a new separate notebook. If needed they can then be moved to a different notebook, or the notebook can be renamed, etc.

On the **terminal application**, in [command-line mode](https://joplin.cozic.net/terminal#command-line-mode), type `import /path/to/file.enex`. This will import the notes into a new notebook named after the filename.

## Importing from Markdown files

Joplin can import notes from plain Markdown file. You can either import a complete directory of Markdown files or individual files.

On the **desktop application**, open File > Import > MD and select your Markdown file or directory.

On the **terminal application**, in [command-line mode](https://joplin.cozic.net/terminal#command-line-mode), type `import --format md /path/to/file.md` or `import --format md /path/to/directory/`.

## Importing from other applications

In general the way to import notes from any application into Joplin is to convert the notes to ENEX files (Evernote format) and to import these ENEX files into Joplin using the method above. Most note-taking applications support ENEX files so it should be relatively straightforward. For help about specific applications, see below:

* Standard Notes: Please see [this tutorial](https://programadorwebvalencia.com/migrate-notes-from-standard-notes-to-joplin/)
* Tomboy Notes: Export the notes to ENEX files [as described here](https://askubuntu.com/questions/243691/how-can-i-export-my-tomboy-notes-into-evernote/608551) for example, and import these ENEX files into Joplin.
* OneNote: First [import the notes from OneNote into Evernote](https://discussion.evernote.com/topic/107736-is-there-a-way-to-import-from-onenote-into-evernote-on-the-mac/). Then export the ENEX file from Evernote and import it into Joplin.
* NixNote: Synchronise with Evernote, then export the ENEX files and import them into Joplin. More info [in this thread](https://discourse.joplin.cozic.net/t/import-from-nixnote/183/3).

# Exporting

Joplin can export to the JEX format (Joplin Export file), which is a tar file that can contain multiple notes, notebooks, etc. This is a lossless format in that all the notes, but also metadata such as geo-location, updated time, tags, etc. are preserved. This format is convenient for backup purposes and can be re-imported into Joplin. A "raw" format is also available. This is the same as the JEX format except that the data is saved to a directory and each item represented by a single file.

# Synchronisation

One of the goals of Joplin was to avoid being tied to any particular company or service, whether it is Evernote, Google or Microsoft. As such the synchronisation is designed without any hard dependency to any particular service. Most of the synchronisation process is done at an abstract level and access to external services, such as Nextcloud or Dropbox, is done via lightweight drivers. It is easy to support new services by creating simple drivers that provide a filesystem-like interface, i.e. the ability to read, write, delete and list items. It is also simple to switch from one service to another or to even sync to multiple services at once. Each note, notebook, tags, as well as the relation between items is transmitted as plain text files during synchronisation, which means the data can also be moved to a different application, can be easily backed up, inspected, etc.

Currently, synchronisation is possible with Nextcloud, Dropbox (by default), OneDrive or the local filesystem. To setup synchronisation please follow the instructions below. After that, the application will synchronise in the background whenever it is running, or you can click on "Synchronise" to start a synchronisation manually.

## Nextcloud synchronisation

<img src="https://joplin.cozic.net/images/nextcloud-logo-background.png" width="100" align="left"> <a href="https://nextcloud.com/">Nextcloud</a> is a self-hosted, private cloud solution. It can store documents, images and videos but also calendars, passwords and countless other things and can sync them to your laptop or phone. As you can host your own Nextcloud server, you own both the data on your device and infrastructure used for synchronisation. As such it is a good fit for Joplin. The platform is also well supported and with a strong community, so it is likely to be around for a while - since it's open source anyway, it is not a service that can be closed, it can exist on a server for as long as one chooses.

On the **desktop application** or **mobile application**, go to the config screen and select Nextcloud as the synchronisation target. Then input the WebDAV URL (to get it, click on Settings in the bottom left corner of the page, in Nextcloud), this is normally `https://example.com/nextcloud/remote.php/webdav/Joplin` (**make sure to create the "Joplin" directory in Nextcloud**), and set the username and password. If it does not work, please [see this explanation](https://github.com/laurent22/joplin/issues/61#issuecomment-373282608) for more details.

On the **terminal application**, you will need to set the `sync.target` config variable and all the `sync.5.path`, `sync.5.username` and `sync.5.password` config variables to, respectively the Nextcloud WebDAV URL, your username and your password. This can be done from the command line mode using:

	:config sync.5.path https://example.com/nextcloud/remote.php/webdav/Joplin
	:config sync.5.username YOUR_USERNAME
	:config sync.5.password YOUR_PASSWORD
	:config sync.target 5

If synchronisation does not work, please consult the logs in the app profile directory - it is often due to a misconfigured URL or password. The log should indicate what the exact issue is.

## Dropbox synchronisation

When syncing with Dropbox, Joplin creates a sub-directory in Dropbox, in `/Apps/Joplin` and read/write the notes and notebooks from it. The application does not have access to anything outside this directory.

On the **desktop application** or **mobile application**, select "Dropbox" as the synchronisation target in the config screen (it is selected by default). Then, to initiate the synchronisation process, click on the "Synchronise" button in the sidebar and follow the instructions.

On the **terminal application**, to initiate the synchronisation process, type `:sync`. You will be asked to follow a link to authorise the application. It is possible to also synchronise outside of the user interface by typing `joplin sync` from the terminal. This can be used to setup a cron script to synchronise at regular interval. For example, this would do it every 30 minutes:

	*/30 * * * * /path/to/joplin sync

## WebDAV synchronisation

Select the "WebDAV" synchronisation target and follow the same instructions as for Nextcloud above.

WebDAV-compatible services that are known to work with Joplin:

- [Apache WebDAV Module](https://httpd.apache.org/docs/current/mod/mod_dav.html)
- [Box.com](https://www.box.com/)
- [DriveHQ](https://www.drivehq.com)
- [Fastmail](https://www.fastmail.com/)
- [HiDrive](https://www.strato.fr/stockage-en-ligne/) from Strato. [Setup help](https://github.com/laurent22/joplin/issues/309)
- [Nginx WebDAV Module](https://nginx.org/en/docs/http/ngx_http_dav_module.html)
- [NextCloud](https://nextcloud.com/)
- [OwnCloud](https://owncloud.org/)
- [Seafile](https://www.seafile.com/)
- [Stack](https://www.transip.nl/stack/)
- [WebDAV Nav](https://www.schimera.com/products/webdav-nav-server/), a macOS server.
- [Zimbra](https://www.zimbra.com/)

## OneDrive synchronisation

When syncing with OneDrive, Joplin creates a sub-directory in OneDrive, in /Apps/Joplin and read/write the notes and notebooks from it. The application does not have access to anything outside this directory.

On the **desktop application** or **mobile application**, select "OneDrive" as the synchronisation target in the config screen. Then, to initiate the synchronisation process, click on the "Synchronise" button in the sidebar and follow the instructions.

On the **terminal application**, to initiate the synchronisation process, type `:sync`. You will be asked to follow a link to authorise the application (simply input your Microsoft credentials - you do not need to register with OneDrive).

# Encryption

Joplin supports end-to-end encryption (E2EE) on all the applications. E2EE is a system where only the owner of the notes, notebooks, tags or resources can read them. It prevents potential eavesdroppers - including telecom providers, internet providers, and even the developers of Joplin from being able to access the data. Please see the [End-To-End Encryption Tutorial](https://joplin.cozic.net/e2ee) for more information about this feature and how to enable it.

For a more technical description, mostly relevant for development or to review the method being used, please see the [Encryption specification](https://joplin.cozic.net/spec).

# External text editor

Joplin notes can be opened and edited using an external editor of your choice. It can be a simple text editor like Notepad++ or Sublime Text or an actual Markdown editor like Typora. In that case, images will also be displayed within the editor. To open the note in an external editor, click on the icon in the toolbar or press Ctrl+E (or Cmd+E). Your default text editor will be used to open the note. If needed, you can also specify the editor directly in the General Options, under "Text editor command".

# Attachments / Resources

Any kind of file can be attached to a note. In Markdown, links to these files are represented as a simple ID to the resource. In the note viewer, these files, if they are images, will be displayed or, if they are other files (PDF, text files, etc.) they will be displayed as links. Clicking on this link will open the file in the default application.

On the **desktop application**, images can be attached either by clicking on "Attach file" or by pasting (with Ctrl+V) an image directly in the editor, or by drag and dropping an image.

Resources that are not attached to any note will be automatically deleted after 10 days (see [rationale](https://github.com/laurent22/joplin/issues/154#issuecomment-356582366)).

**Important:** Resources larger than 10 MB are not currently supported on mobile. They will crash the application when synchronising so it is recommended not to attach such resources at the moment. The issue is being looked at.

# Notifications

On the desktop and mobile apps, an alarm can be associated with any to-do. It will be triggered at the given time by displaying a notification. How the notification will be displayed depends on the operating system since each has a different way to handle this. Please see below for the requirements for the desktop applications:

- **Windows**: >= 8. Make sure the Action Center is enabled on Windows. Task bar balloon for Windows < 8. Growl as fallback. Growl takes precedence over Windows balloons.
- **macOS**: >= 10.8 or Growl if earlier.
- **Linux**: `notify-osd` or `libnotify-bin` installed (Ubuntu should have this by default). Growl otherwise

See [documentation and flow chart for reporter choice](https://github.com/mikaelbr/node-notifier/blob/master/DECISION_FLOW.md)

On mobile, the alarms will be displayed using the built-in notification system.

If for any reason the notifications do not work, please [open an issue](https://github.com/laurent22/joplin/issues).

# Sub-notebooks

Sub-notebooks allow organising multiple notebooks into a tree of notebooks. For example it can be used to regroup all the notebooks related to work, to family or to a particular project under a parent notebook.

![](https://joplin.cozic.net/images/SubNotebooks.png)

- On the **desktop application**, to create a subnotebook, drag and drop it onto another notebook. To move it back to the root, drag and drop it on the "Notebooks" header. Currently only the desktop app can be used to organise the notebooks.
- The **mobile application** supports displaying and collapsing/expanding the tree of notebooks, however it does not currently support moving the subnotebooks to different notebooks.
- The **terminal app** supports displaying the tree of subnotebooks but it does not support collapsing/expanding them or moving the subnotebooks around.

# Markdown

Joplin uses and renders [Github-flavoured Markdown](https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet) with a few variations and additions. In particular:

## Links to other notes

You can create a link to a note by specifying its ID in the URL. For example:

	[Link to my note](:/0b0d62d15e60409dac34f354b6e9e839)

Since getting the ID of a note is not straightforward, each app provides a way to create such link. In the **desktop app**, right click on a note an select "Copy Markdown link". In the **mobile app**, open a note and, in the top right menu, select "Copy Markdown link". You can then paste this link anywhere in another note.

## Charts

You can create charts in Joplin using the [Mermaid syntax](https://mermaidjs.github.io/). To add such a graph, wrap the Mermaid script inside a "\`\`\`mermaid" code block like this:

	```mermaid
	graph TD;
	    A-->B;
	    A-->C;
	    B-->D;
	    C-->D;
	```

This is how it would look with the Markdown on the left, and rendered graph on the right:

![Mermaid support in Joplin](https://joplin.cozic.net/images/Mermaid.png)

Note that Mermaid graphs are always rendered on a white background regardless of the current theme. This is because they can contain various colours that may not be compatible with the current theme.

## Math notation

Math expressions can be added using the [KaTeX notation](https://khan.github.io/KaTeX/). To add an inline equation, wrap the expression in `$EXPRESSION$`, eg. `$\sqrt{3x-1}+(1+x)^2$`. To create an expression block, wrap it as follow:

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

<img src="https://joplin.cozic.net/images/Katex.png" style="max-width: 100%; max-height: 35em;">

## Checkboxes

Checkboxes can be added like so:

	- [ ] Milk
	- [ ] Rice
	- [ ] Eggs

The checkboxes can then be ticked in the mobile and desktop applications.

## HTML support

It is generally recommended to enter the notes as Markdown as it makes the notes easier to edit. However for cases where certain features aren't supported (such as strikethrough or to highlight text), you can also use HTML code directly. For example this would be a valid note:

	This is <s>strikethrough text</s> mixed with regular **Markdown**.

## Custom CSS

Rendered markdown can be customized by placing a userstyle file in the profile directory `~/.config/joplin-desktop/userstyle.css` (This path might be different on your device - check at the top of the Config screen for the exact path). This file supports standard CSS syntax. Note that this file is used only when display the notes, **not when printing or exporting to PDF**. This is because printing has a lot more restrictions (for example, printing white text over a black background is usually not wanted), so special rules are applied to make it look good when printing, and a userstyle.css would interfer with that.

# Searching

Joplin implements the SQLite Full Text Search (FTS4) extension. It means the content of all the notes is indexed in real time and search queries return results very fast. Both [Simple FTS Queries](https://www.sqlite.org/fts3.html#simple_fts_queries) and [Full-Text Index Queries](https://www.sqlite.org/fts3.html#full_text_index_queries) are supported. See below for the list of supported queries:

Search type | Description | Example
------------|-------------|---------
Single word | Returns all the notes that contain this term. | `dog`, `cat`
Multiples words | Returns all the notes that contain **all** these words, but not necessarily next to each other. | `dog cat` - will return any notes that contain the words "dog" and "cat" anywhere in the note, no necessarily in that order nor next to each others. It will **not** return results that contain "dog" or "cat" only.
Phrase query | Add double quotes to return the notes that contain exactly this phrase. | `"shopping list"` - will return the notes that contain these **exact terms** next to each others and in this order. It will **not** return for example a note that contain "going shopping with my list".
Prefix | Add a wildmark to return all the notes that contain a term with a specified prefix. | `swim*` - will return all the notes that contain eg. "swim", but also "swimming", "swimsuit", etc. IMPORTANT: The wildcard **can only be at the end** - it will be ignored at the beginning of a word (eg. `*swim`) and will be treated as a literal asterisk in the middle of a word (eg. `ast*rix`)
Field restricted | Add either `title:` or `body:` before a note to restrict your search to just the title, or just the body. | `title:shopping`, `body:egg`

Notes are sorted by "relevance". Currently it means the notes that contain the requested terms the most times are on top. For queries with multiple terms, it also matter how close to each others are the terms. This is a bit experimental so if you notice a search query that returns unexpected results, please report it in the forum, providing as much details as possible to replicate the issue.

# Donations

Donations to Joplin support the development of the project. Developing quality applications mostly takes time, but there are also some expenses, such as digital certificates to sign the applications, app store fees, hosting, etc. Most of all, your donation will make it possible to keep up the current development standard.

Please see the [donation page](https://joplin.cozic.net/donate/) for information on how to support the development of Joplin.

# Community

- For general discussion about Joplin, user support, software development questions, and to discuss new features, go to the [Joplin Forum](https://discourse.joplin.cozic.net/). It is possible to login with your GitHub account.
- Also see here for information about [the latest releases and general news](https://discourse.joplin.cozic.net/c/news).
- For bug reports and feature requests, go to the [GitHub Issue Tracker](https://github.com/laurent22/joplin/issues).
- The latest news are posted [on the Patreon page](https://www.patreon.com/joplin).

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
![](https://joplin.cozic.net/images/flags/es/basque_country.png)  |  Basque  |  [eu](https://github.com/laurent22/joplin/blob/master/CliClient/locales/eu.po)  |  juan.abasolo@ehu.eus  |  56%
![](https://joplin.cozic.net/images/flags/es/catalonia.png)  |  Catalan  |  [ca](https://github.com/laurent22/joplin/blob/master/CliClient/locales/ca.po)  |  jmontane, 2018  |  80%
![](https://joplin.cozic.net/images/flags/country-4x3/hr.png)  |  Croatian  |  [hr_HR](https://github.com/laurent22/joplin/blob/master/CliClient/locales/hr_HR.po)  |  Hrvoje Mandić (trbuhom@net.hr)  |  45%
![](https://joplin.cozic.net/images/flags/country-4x3/cz.png)  |  Czech  |  [cs_CZ](https://github.com/laurent22/joplin/blob/master/CliClient/locales/cs_CZ.po)  |  Lukas Helebrandt (lukas@aiya.cz)  |  71%
![](https://joplin.cozic.net/images/flags/country-4x3/dk.png)  |  Dansk  |  [da_DK](https://github.com/laurent22/joplin/blob/master/CliClient/locales/da_DK.po)  |  Morten Juhl-Johansen Zölde-Fejér (mjjzf@syntaktisk.  |  72%
![](https://joplin.cozic.net/images/flags/country-4x3/de.png)  |  Deutsch  |  [de_DE](https://github.com/laurent22/joplin/blob/master/CliClient/locales/de_DE.po)  |  Michael Sonntag (ms@editorei.de)  |  98%
![](https://joplin.cozic.net/images/flags/country-4x3/gb.png)  |  English  |  [en_GB](https://github.com/laurent22/joplin/blob/master/CliClient/locales/en_GB.po)  |    |  100%
![](https://joplin.cozic.net/images/flags/country-4x3/es.png)  |  Español  |  [es_ES](https://github.com/laurent22/joplin/blob/master/CliClient/locales/es_ES.po)  |  Fernando Martín (f@mrtn.es)  |  88%
![](https://joplin.cozic.net/images/flags/country-4x3/fr.png)  |  Français  |  [fr_FR](https://github.com/laurent22/joplin/blob/master/CliClient/locales/fr_FR.po)  |  Laurent Cozic  |  100%
![](https://joplin.cozic.net/images/flags/es/galicia.png)  |  Galician  |  [gl_ES](https://github.com/laurent22/joplin/blob/master/CliClient/locales/gl_ES.po)  |  Marcos Lans (marcoslansgarza@gmail.com)  |  71%
![](https://joplin.cozic.net/images/flags/country-4x3/it.png)  |  Italiano  |  [it_IT](https://github.com/laurent22/joplin/blob/master/CliClient/locales/it_IT.po)  |    |  89%
![](https://joplin.cozic.net/images/flags/country-4x3/be.png)  |  Nederlands  |  [nl_BE](https://github.com/laurent22/joplin/blob/master/CliClient/locales/nl_BE.po)  |    |  56%
![](https://joplin.cozic.net/images/flags/country-4x3/nl.png)  |  Nederlands  |  [nl_NL](https://github.com/laurent22/joplin/blob/master/CliClient/locales/nl_NL.po)  |  Heimen Stoffels (vistausss@outlook.com)  |  86%
![](https://joplin.cozic.net/images/flags/country-4x3/no.png)  |  Norwegian  |  [nb_NO](https://github.com/laurent22/joplin/blob/master/CliClient/locales/nb_NO.po)  |  Mats Estensen (code@mxe.no)  |  94%
![](https://joplin.cozic.net/images/flags/country-4x3/br.png)  |  Português (Brasil)  |  [pt_BR](https://github.com/laurent22/joplin/blob/master/CliClient/locales/pt_BR.po)  |  Renato Nunes Bastos (rnbastos@gmail.com)  |  93%
![](https://joplin.cozic.net/images/flags/country-4x3/ro.png)  |  Română  |  [ro](https://github.com/laurent22/joplin/blob/master/CliClient/locales/ro.po)  |    |  56%
![](https://joplin.cozic.net/images/flags/country-4x3/si.png)  |  Slovenian  |  [sl_SI](https://github.com/laurent22/joplin/blob/master/CliClient/locales/sl_SI.po)  |    |  70%
![](https://joplin.cozic.net/images/flags/country-4x3/se.png)  |  Svenska  |  [sv](https://github.com/laurent22/joplin/blob/master/CliClient/locales/sv.po)  |  Jonatan Nyberg (jonatan@autistici.org)  |  96%
![](https://joplin.cozic.net/images/flags/country-4x3/tr.png)  |  Türkçe  |  [tr_TR](https://github.com/laurent22/joplin/blob/master/CliClient/locales/tr_TR.po)  |  Zorbey Doğangüneş (zorbeyd@gmail.com)  |  93%
![](https://joplin.cozic.net/images/flags/country-4x3/ru.png)  |  Русский  |  [ru_RU](https://github.com/laurent22/joplin/blob/master/CliClient/locales/ru_RU.po)  |  Artyom Karlov (artyom.karlov@gmail.com)  |  98%
![](https://joplin.cozic.net/images/flags/country-4x3/cn.png)  |  中文 (简体)  |  [zh_CN](https://github.com/laurent22/joplin/blob/master/CliClient/locales/zh_CN.po)  |    |  97%
![](https://joplin.cozic.net/images/flags/country-4x3/tw.png)  |  中文 (繁體)  |  [zh_TW](https://github.com/laurent22/joplin/blob/master/CliClient/locales/zh_TW.po)  |  penguinsam (samliu@gmail.com)  |  86%
![](https://joplin.cozic.net/images/flags/country-4x3/jp.png)  |  日本語  |  [ja_JP](https://github.com/laurent22/joplin/blob/master/CliClient/locales/ja_JP.po)  |  AWASHIRO Ikuya (ikunya@gmail.com)  |  93%
![](https://joplin.cozic.net/images/flags/country-4x3/kr.png)  |  한국어  |  [ko](https://github.com/laurent22/joplin/blob/master/CliClient/locales/ko.po)  |    |  95%
<!-- LOCALE-TABLE-AUTO-GENERATED -->

# Known bugs

- Resources larger than 10 MB are not currently supported on mobile. They will crash the application so it is recommended not to attach such resources at the moment. The issue is being looked at.
- Non-alphabetical characters such as Chinese or Arabic might create glitches in the terminal on Windows. This is a limitation of the current Windows console.
- It is only possible to upload files of up to 4MB to OneDrive due to a limitation of [the API](https://docs.microsoft.com/en-gb/onedrive/developer/rest-api/api/driveitem_put_content) being currently used. There is currently no plan to support OneDrive "large file" API.

# License

MIT License

Copyright (c) 2016-2019 Laurent Cozic

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
