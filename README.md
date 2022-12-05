<!-- DONATELINKS -->
[![Donate using PayPal](https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/badges/Donate-PayPal-green.svg)](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=E8JMYD2LQ8MMA&lc=GB&item_name=Joplin+Development&currency_code=EUR&bn=PP%2dDonationsBF%3abtn_donateCC_LG%2egif%3aNonHosted) [![Sponsor on GitHub](https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/badges/GitHub-Badge.svg)](https://github.com/sponsors/laurent22/) [![Become a patron](https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/badges/Patreon-Badge.svg)](https://www.patreon.com/joplin) [![Donate using IBAN](https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/badges/Donate-IBAN.svg)](https://joplinapp.org/donate/#donations)
<!-- DONATELINKS -->

<img width="64" src="https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/LinuxIcons/256x256.png" align="left" /> **Joplin** is a free, open source note taking and to-do application, which can handle a large number of notes organised into notebooks. The notes are searchable, can be copied, tagged and modified either from the applications directly or from your own text editor. The notes are in [Markdown format](#markdown).

Notes exported from Evernote [can be imported](#importing) into Joplin, including the formatted content (which is converted to Markdown), resources (images, attachments, etc.) and complete metadata (geolocation, updated time, created time, etc.). Plain Markdown files can also be imported.

The notes can be securely [synchronised](#synchronisation) using [end-to-end encryption](#encryption) with various cloud services including Nextcloud, Dropbox, OneDrive and [Joplin Cloud](https://joplinapp.org/plans/).

Full text search is available on all platforms to quickly find the information you need. The app can be customised using plugins and themes, and you can also easily create your own.

The application is available for Windows, Linux, macOS, Android and iOS. A [Web Clipper](https://github.com/laurent22/joplin/blob/dev/readme/clipper.md), to save web pages and screenshots from your browser, is also available for [Firefox](https://addons.mozilla.org/firefox/addon/joplin-web-clipper/) and [Chrome](https://chrome.google.com/webstore/detail/joplin-web-clipper/alofnhikmmkdbbbgpnglcpdollgjjfek?hl=en-GB).

<div class="top-screenshot"><img src="https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/home-top-img.png" style="max-width: 100%; max-height: 35em;"></div>

# Installation

Three types of applications are available: for **desktop** (Windows, macOS and Linux), for **mobile** (Android and iOS) and for **terminal** (Windows, macOS, Linux and FreeBSD). All the applications have similar user interfaces and can synchronise with each other.

## Desktop applications

Operating System | Download
---|---
Windows (32 and 64-bit) | <a href='https://github.com/laurent22/joplin/releases/download/v2.8.8/Joplin-Setup-2.8.8.exe'><img alt='Get it on Windows' width="134px" src='https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/BadgeWindows.png'/></a>
macOS | <a href='https://github.com/laurent22/joplin/releases/download/v2.8.8/Joplin-2.8.8.dmg'><img alt='Get it on macOS' width="134px" src='https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/BadgeMacOS.png'/></a>
Linux | <a href='https://github.com/laurent22/joplin/releases/download/v2.8.8/Joplin-2.8.8.AppImage'><img alt='Get it on Linux' width="134px" src='https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/BadgeLinux.png'/></a>

**On Windows**, you may also use the <a href='https://github.com/laurent22/joplin/releases/download/v2.8.8/JoplinPortable.exe'>Portable version</a>. The [portable application](https://en.wikipedia.org/wiki/Portable_application) allows installing the software on a portable device such as a USB key. Simply copy the file JoplinPortable.exe in any directory on that USB key ; the application will then create a directory called "JoplinProfile" next to the executable file.

**On Linux**, the recommended way is to use the following installation script as it will handle the desktop icon too:

<pre><code style="word-break: break-all">wget -O - https://raw.githubusercontent.com/laurent22/joplin/dev/Joplin_install_and_update.sh | bash</code></pre>

## Mobile applications

Operating System | Download | Alt. Download
---|---|---
Android | <a href='https://play.google.com/store/apps/details?id=net.cozic.joplin&utm_source=GitHub&utm_campaign=README&pcampaignid=MKT-Other-global-all-co-prtnr-py-PartBadge-Mar2515-1'><img alt='Get it on Google Play' height="40px" src='https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/BadgeAndroid.png'/></a> | or download the APK file: [64-bit](https://github.com/laurent22/joplin-android/releases/download/android-v2.8.1/joplin-v2.8.1.apk) [32-bit](https://github.com/laurent22/joplin-android/releases/download/android-v2.8.1/joplin-v2.8.1-32bit.apk)
iOS | <a href='https://itunes.apple.com/us/app/joplin/id1315599797'><img alt='Get it on the App Store' height="40px" src='https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/BadgeIOS.png'/></a> | -

## Terminal application

Operating system | Method
-----------------|----------------
macOS, Linux, or Windows (via [WSL](https://msdn.microsoft.com/en-us/commandline/wsl/faq?f=255&MSPPError=-2147217396)) | **Important:** First, [install Node 12+](https://nodejs.org/en/download/package-manager/).<br/><br/>`NPM_CONFIG_PREFIX=~/.joplin-bin npm install -g joplin`<br/>`sudo ln -s ~/.joplin-bin/bin/joplin /usr/bin/joplin`<br><br>By default, the application binary will be installed under `~/.joplin-bin`. You may change this directory if needed. Alternatively, if your npm permissions are setup as described [here](https://docs.npmjs.com/getting-started/fixing-npm-permissions#option-2-change-npms-default-directory-to-another-directory) (Option 2) then simply running `npm -g install joplin` would work.

To start it, type `joplin`.

For usage information, please refer to the full [Joplin Terminal Application Documentation](https://joplinapp.org/terminal/).

## Web Clipper

The Web Clipper is a browser extension that allows you to save web pages and screenshots from your browser. For more information on how to install and use it, see the [Web Clipper Help Page](https://github.com/laurent22/joplin/blob/dev/readme/clipper.md).

## Unofficial Alternative Distributions

There are a number of unofficial alternative Joplin distributions. If you do not want to or cannot use appimages or any of the other officially supported releases then you may wish to consider these.

However these come with a caveat in that they are not officially supported so certain issues may not be supportable by the main project. Rather support requests, bug reports and general advice would need to go to the maintainers of these distributions.

A community maintained list of these distributions can be found here: [Unofficial Joplin distributions](https://discourse.joplinapp.org/t/unofficial-alternative-joplin-distributions/23703)

# Sponsors

<!-- SPONSORS-ORG -->
<a href="https://seirei.ne.jp"><img title="Serei Network" width="256" src="https://joplinapp.org/images/sponsors/SeireiNetwork.png"/></a> <a href="https://usrigging.com/"><img title="U.S. Ringing Supply" width="256" src="https://joplinapp.org/images/sponsors/RingingSupply.svg"/></a> <a href="https://www.hosting.de/nextcloud/?mtm_campaign=managed-nextcloud&amp;mtm_kwd=joplinapp&amp;mtm_source=joplinapp-github&amp;mtm_medium=banner"><img title="Hosting.de" width="256" src="https://joplinapp.org/images/sponsors/HostingDe.png"/></a> <a href="https://residence-greece.com/"><img title="Greece Golden Visa" width="256" src="https://joplinapp.org/images/sponsors/ResidenceGreece.jpg"/></a>
<!-- SPONSORS-ORG -->

* * *

<!-- SPONSORS-GITHUB -->
|       |       |       |       |
| :---: | :---: | :---: | :---: |
| <img width="50" src="https://avatars2.githubusercontent.com/u/215668?s=96&v=4"/></br>[avanderberg](https://github.com/avanderberg) | <img width="50" src="https://avatars2.githubusercontent.com/u/3061769?s=96&v=4"/></br>[c-nagy](https://github.com/c-nagy) | <img width="50" src="https://avatars2.githubusercontent.com/u/70780798?s=96&v=4"/></br>[cabottech](https://github.com/cabottech) | <img width="50" src="https://avatars2.githubusercontent.com/u/67130?s=96&v=4"/></br>[chr15m](https://github.com/chr15m) |
| <img width="50" src="https://avatars2.githubusercontent.com/u/4862947?s=96&v=4"/></br>[chrootlogin](https://github.com/chrootlogin) | <img width="50" src="https://avatars2.githubusercontent.com/u/82579431?s=96&v=4"/></br>[clmntsl](https://github.com/clmntsl) | <img width="50" src="https://avatars2.githubusercontent.com/u/808091?s=96&v=4"/></br>[cuongtransc](https://github.com/cuongtransc) | <img width="50" src="https://avatars2.githubusercontent.com/u/1307332?s=96&v=4"/></br>[dbrandonjohnson](https://github.com/dbrandonjohnson) |
| <img width="50" src="https://avatars2.githubusercontent.com/u/1439535?s=96&v=4"/></br>[fbloise](https://github.com/fbloise) | <img width="50" src="https://avatars2.githubusercontent.com/u/49439044?s=96&v=4"/></br>[fourstepper](https://github.com/fourstepper) | <img width="50" src="https://avatars2.githubusercontent.com/u/38898566?s=96&v=4"/></br>[h4sh5](https://github.com/h4sh5) | <img width="50" src="https://avatars2.githubusercontent.com/u/3266447?s=96&v=4"/></br>[iamwillbar](https://github.com/iamwillbar) |
| <img width="50" src="https://avatars2.githubusercontent.com/u/37297218?s=96&v=4"/></br>[Jesssullivan](https://github.com/Jesssullivan) | <img width="50" src="https://avatars2.githubusercontent.com/u/1310474?s=96&v=4"/></br>[jknowles](https://github.com/jknowles) | <img width="50" src="https://avatars2.githubusercontent.com/u/1248504?s=96&v=4"/></br>[joesfer](https://github.com/joesfer) | <img width="50" src="https://avatars2.githubusercontent.com/u/5588131?s=96&v=4"/></br>[kianenigma](https://github.com/kianenigma) |
| <img width="50" src="https://avatars2.githubusercontent.com/u/24908652?s=96&v=4"/></br>[konishi-t](https://github.com/konishi-t) | <img width="50" src="https://avatars2.githubusercontent.com/u/42319182?s=96&v=4"/></br>[marcdw1289](https://github.com/marcdw1289) | <img width="50" src="https://avatars2.githubusercontent.com/u/1788010?s=96&v=4"/></br>[maxtruxa](https://github.com/maxtruxa) | <img width="50" src="https://avatars2.githubusercontent.com/u/29300939?s=96&v=4"/></br>[mcejp](https://github.com/mcejp) |
| <img width="50" src="https://avatars2.githubusercontent.com/u/1168659?s=96&v=4"/></br>[nicholashead](https://github.com/nicholashead) | <img width="50" src="https://avatars2.githubusercontent.com/u/5782817?s=96&v=4"/></br>[piccobit](https://github.com/piccobit) | <img width="50" src="https://avatars2.githubusercontent.com/u/77214738?s=96&v=4"/></br>[Polymathic-Company](https://github.com/Polymathic-Company) | <img width="50" src="https://avatars2.githubusercontent.com/u/47742?s=96&v=4"/></br>[ravenscroftj](https://github.com/ravenscroftj) |
| <img width="50" src="https://avatars2.githubusercontent.com/u/327998?s=96&v=4"/></br>[sif](https://github.com/sif) | <img width="50" src="https://avatars2.githubusercontent.com/u/54626606?s=96&v=4"/></br>[skyrunner15](https://github.com/skyrunner15) | <img width="50" src="https://avatars2.githubusercontent.com/u/765564?s=96&v=4"/></br>[taskcruncher](https://github.com/taskcruncher) | <img width="50" src="https://avatars2.githubusercontent.com/u/73081837?s=96&v=4"/></br>[thismarty](https://github.com/thismarty) |
| <img width="50" src="https://avatars2.githubusercontent.com/u/15859362?s=96&v=4"/></br>[thomasbroussard](https://github.com/thomasbroussard) |       |       |       |
<!-- SPONSORS-GITHUB -->

<!-- TOC -->
# Table of contents

- Applications

	- [Desktop application](https://github.com/laurent22/joplin/blob/dev/readme/desktop.md)
	- [Mobile applications](https://github.com/laurent22/joplin/blob/dev/readme/mobile.md)
	- [Terminal application](https://github.com/laurent22/joplin/blob/dev/readme/terminal.md)
	- [Web Clipper](https://github.com/laurent22/joplin/blob/dev/readme/clipper.md)

- Support

	- [Joplin Forum](https://discourse.joplinapp.org)
	- [Markdown Guide](https://github.com/laurent22/joplin/blob/dev/readme/markdown.md)
	- [How to enable end-to-end encryption](https://github.com/laurent22/joplin/blob/dev/readme/e2ee.md)
	- [What is a conflict?](https://github.com/laurent22/joplin/blob/dev/readme/conflict.md)
	- [How to enable debug mode](https://github.com/laurent22/joplin/blob/dev/readme/debugging.md)
	- [About the Rich Text editor limitations](https://github.com/laurent22/joplin/blob/dev/readme/rich_text_editor.md)
	- [External links](https://github.com/laurent22/joplin/blob/dev/readme/external_links.md)
	- [FAQ](https://github.com/laurent22/joplin/blob/dev/readme/faq.md)

- Joplin Cloud

	- [Sharing a notebook](https://github.com/laurent22/joplin/blob/dev/readme/share_notebook.md)
	- [Publishing a note](https://github.com/laurent22/joplin/blob/dev/readme/publish_note.md)

- Joplin API - Get Started

	- [Joplin API Overview](https://github.com/laurent22/joplin/blob/dev/readme/api/overview.md)
	- [Plugin development](https://github.com/laurent22/joplin/blob/dev/readme/api/get_started/plugins.md)
	- [Plugin tutorial](https://github.com/laurent22/joplin/blob/dev/readme/api/tutorials/toc_plugin.md)


- Joplin API - References

	- [Plugin API](https://joplinapp.org/api/references/plugin_api/classes/joplin.html)
	- [Data API](https://github.com/laurent22/joplin/blob/dev/readme/api/references/rest_api.md)
	- [Plugin manifest](https://github.com/laurent22/joplin/blob/dev/readme/api/references/plugin_manifest.md)
	- [Plugin loading rules](https://github.com/laurent22/joplin/blob/dev/readme/api/references/plugin_loading_rules.md)
	- [Plugin theming](https://github.com/laurent22/joplin/blob/dev/readme/api/references/plugin_theming.md)

- Development

	- [How to build the apps](https://github.com/laurent22/joplin/blob/dev/BUILD.md)
	- [Writing a technical spec](https://github.com/laurent22/joplin/blob/dev/readme/technical_spec.md)
	- [Desktop application styling](https://github.com/laurent22/joplin/blob/dev/readme/spec/desktop_styling.md)
	- [Note History spec](https://github.com/laurent22/joplin/blob/dev/readme/spec/history.md)
	- [Sync Lock spec](https://github.com/laurent22/joplin/blob/dev/readme/spec/sync_lock.md)
	- [Synchronous Scroll spec](https://github.com/laurent22/joplin/blob/dev/readme/spec/sync_scroll.md)
	- [Plugin Architecture spec](https://github.com/laurent22/joplin/blob/dev/readme/spec/plugins.md)
	- [Search Sorting spec](https://github.com/laurent22/joplin/blob/dev/readme/spec/search_sorting.md)
	- [E2EE: Technical spec](https://github.com/laurent22/joplin/blob/dev/readme/spec/e2ee.md)
	- [E2EE: Workflow](https://github.com/laurent22/joplin/blob/dev/readme/spec/e2ee/workflow.md)
	- [Server: File URL Format](https://github.com/laurent22/joplin/blob/dev/readme/spec/server_file_url_format.md)
	- [Server: Delta Sync](https://github.com/laurent22/joplin/blob/dev/readme/spec/server_delta_sync.md)
	- [Server: Sharing](https://github.com/laurent22/joplin/blob/dev/readme/spec/server_sharing.md)

- Google Summer of Code 2022

	- [Google Summer of Code 2022](https://github.com/laurent22/joplin/blob/dev/readme/gsoc2022/index.md)
	- [How to submit a GSoC pull request](https://github.com/laurent22/joplin/blob/dev/readme/gsoc2022/pull_request_guidelines.md)
	- [Project Ideas](https://github.com/laurent22/joplin/blob/dev/readme/gsoc2022/ideas.md)

- About

	- [Changelog (Desktop App)](https://github.com/laurent22/joplin/blob/dev/readme/changelog.md)
	- [Changelog (Android)](https://github.com/laurent22/joplin/blob/dev/readme/changelog_android.md)
	- [Changelog (iOS)](https://github.com/laurent22/joplin/blob/dev/readme/changelog_ios.md)
	- [Changelog (CLI App)](https://github.com/laurent22/joplin/blob/dev/readme/changelog_cli.md)
	- [Changelog (Server)](https://github.com/laurent22/joplin/blob/dev/readme/changelog_server.md)
	- [Stats](https://github.com/laurent22/joplin/blob/dev/readme/stats.md)
	- [Donate](https://github.com/laurent22/joplin/blob/dev/readme/donate.md)
<!-- TOC -->

# Features

- Desktop, mobile and terminal applications.
- [Web Clipper](https://github.com/laurent22/joplin/blob/dev/readme/clipper.md) for Firefox and Chrome.
- End To End Encryption (E2EE).
- Note history (revisions).
- Synchronisation with various services, including Nextcloud, Dropbox, WebDAV and OneDrive.
- Offline first, so the entire data is always available on the device even without an internet connection.
- Import Enex files (Evernote export format) and Markdown files.
- Export JEX files (Joplin Export format) and raw files.
- Support notes, to-dos, tags and notebooks.
- Sort notes by multiple criteria - title, updated time, etc.
- Support for alarms (notifications) in mobile and desktop applications.
- Markdown notes, which are rendered with images and formatting in the desktop and mobile applications. Support for extra features such as math notation and checkboxes.
- Choice of both Markdown and Rich Text (WYSIWYG) editors.
- File attachment support - images are displayed, other files are linked and can be opened in the relevant application.
- Inline display of PDF, video and audio files.
- Goto Anything feature.
- Search functionality.
- Geo-location support.
- Supports multiple languages.
- External editor support - open notes in your favorite external editor with one click in Joplin.
- Extensible functionality through plugin and data APIs.
- Custom CSS support for customisation of both the rendered markdown and overall user interface.
- Customisable layout allows toggling, movement and sizing of various elements.
- Keyboard shortcuts are editable and allow binding of most Joplin commands with export/import functionality.
- Multiple profile support.

# Importing

## Importing from Evernote

Joplin was designed as a replacement for Evernote and so can import complete Evernote notebooks, as well as notes, tags, resources (attached files) and note metadata (such as author, geo-location, etc.) via ENEX files. In terms of data, the only two things that might slightly differ are:

- Recognition data - Evernote images, in particular scanned (or photographed) documents have [recognition data](https://en.wikipedia.org/wiki/Optical_character_recognition) associated with them. It is the text that Evernote has been able to recognise in the document. This data is not preserved when the note are imported into Joplin. However, should it become supported in the search tool or other parts of Joplin, it should be possible to regenerate this recognition data since the actual image would still be available.

- Colour, font sizes and faces - Evernote text is stored as HTML and this is converted to Markdown during the import process. For notes that are mostly plain text or with basic formatting (bold, italic, bullet points, links, etc.) this is a lossless conversion, and the note, once rendered back to HTML should be very similar. Tables are also imported and converted to Markdown tables. For very complex notes, some formatting data might be lost - in particular colours, font sizes and font faces will not be imported. The text itself however is always imported in full regardless of formatting. If it is essential that this extra data is preserved then Joplin also allows import of ENEX files as HTML.

To import Evernote data, first export your Evernote notebooks to ENEX files as described [here](https://help.evernote.com/hc/en-us/articles/209005557-How-to-back-up-export-and-restore-import-notes-and-notebooks). Then follow these steps:

In the **desktop application**, open File > Import > ENEX and select your file. The notes will be imported into a new separate notebook. If needed they can then be moved to a different notebook, or the notebook can be renamed, etc.

In the **terminal application**, in [command-line mode](https://github.com/laurent22/joplin/blob/dev/readme/terminal.md#command-line-mode), type `import /path/to/file.enex`. This will import the notes into a new notebook named after the filename.

## Importing from Markdown files

Joplin can import notes from plain Markdown file. You can either import a complete directory of Markdown files or individual files.

In the **desktop application**:
* **File import**: Go to File > Import > MD - Markdown (file) and select the Markdown file. This file will then be imported to the currently selected Notebook.
* **Directory import**: Go to File > Import > MD - Markdown (directory) and select the top level of the directory that is being imported. Directory (folder) structure will be preserved in the Notebook > Subnotebook > Note structure within Joplin.

In the **terminal application**, in [command-line mode](https://github.com/laurent22/joplin/blob/dev/readme/terminal.md#command-line-mode), type `import --format md /path/to/file.md` or `import --format md /path/to/directory/`.

## Importing from other applications

In general the way to import notes from any application into Joplin is to convert the notes to ENEX files (Evernote format) and to import these ENEX files into Joplin using the method above. Most note-taking applications support ENEX files so it should be relatively straightforward. For help about specific applications, see below:

* Standard Notes: Please see [this tutorial](https://programadorwebvalencia.com/migrate-notes-from-standard-notes-to-joplin/)
* Tomboy Notes: Export the notes to ENEX files [as described here](https://askubuntu.com/questions/243691/how-can-i-export-my-tomboy-notes-into-evernote/608551) for example, and import these ENEX files into Joplin.
* OneNote: First [import the notes from OneNote into Evernote](https://discussion.evernote.com/topic/107736-is-there-a-way-to-import-from-onenote-into-evernote-on-the-mac/). Then export the ENEX file from Evernote and import it into Joplin.
* NixNote: Synchronise with Evernote, then export the ENEX files and import them into Joplin. More info [in this thread](https://discourse.joplinapp.org/t/import-from-nixnote/183/3).

# Exporting

Joplin can export to the JEX format (Joplin Export file), which is a tar file that can contain multiple notes, notebooks, etc. This is a lossless format in that all the notes, but also metadata such as geo-location, updated time, tags, etc. are preserved. This format is convenient for backup purposes and can be re-imported into Joplin. A "raw" format is also available. This is the same as the JEX format except that the data is saved to a directory and each item represented by a single file.
Joplin is also capable of exporting to a number of other formats including HTML and PDF which can be done for single notes, notebooks or everything.

# Synchronisation

One of the goals of Joplin is to avoid being tied to any particular company or service, whether it is Evernote, Google or Microsoft. As such the synchronisation is designed without any hard dependency to any particular service. Most of the synchronisation process is done at an abstract level and access to external services, such as Nextcloud or Dropbox, is done via lightweight drivers. It is easy to support new services by creating simple drivers that provide a filesystem-like interface, i.e. the ability to read, write, delete and list items. It is also simple to switch from one service to another or to even sync to multiple services at once. Each note, notebook, tags, as well as the relation between items is transmitted as plain text files during synchronisation, which means the data can also be moved to a different application, can be easily backed up, inspected, etc.

Currently, synchronisation is possible with Nextcloud, WebDAV, Dropbox, OneDrive or the local filesystem. To enable synchronisation please follow the instructions below. After that, the application will synchronise in the background whenever it is running, or you can click on "Synchronise" to start a synchronisation manually. Joplin will background sync automatically after any content change is made on the local application.

If the **terminal client** has been installed, it is possible to also synchronise outside of the user interface by typing `joplin sync` from the terminal. This can be used to setup a cron script to synchronise at a regular interval. For example, this would do it every 30 minutes:

` */30 * * * * /path/to/joplin sync`

## Nextcloud synchronisation

<img src="https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/nextcloud-logo-background.png" width="100" align="left"> <a href="https://nextcloud.com/">Nextcloud</a> is a self-hosted, private cloud solution. It can store documents, images and videos but also calendars, passwords and countless other things and can sync them to your laptop or phone. As you can host your own Nextcloud server, you own both the data on your device and infrastructure used for synchronisation. As such it is a good fit for Joplin. The platform is also well supported and with a strong community, so it is likely to be around for a while - since it's open source anyway, it is not a service that can be closed, it can exist on a server for as long as one chooses.

In the **desktop application** or **mobile application**, go to the [Configuration screen](https://github.com/laurent22/joplin/blob/dev/readme/config_screen.md) and select Nextcloud as the synchronisation target. Then input the WebDAV URL (to get it, click on Settings in the bottom left corner of the page, in Nextcloud), this is normally `https://example.com/nextcloud/remote.php/webdav/Joplin` (**make sure to create the "Joplin" directory in Nextcloud**), and set the username and password. If it does not work, please [see this explanation](https://github.com/laurent22/joplin/issues/61#issuecomment-373282608) for more details.

In the **terminal application**, you will need to set the `sync.target` config variable and all the `sync.5.path`, `sync.5.username` and `sync.5.password` config variables to, respectively the Nextcloud WebDAV URL, your username and your password. This can be done from the command line mode using:

	:config sync.5.path https://example.com/nextcloud/remote.php/webdav/Joplin
	:config sync.5.username YOUR_USERNAME
	:config sync.5.password YOUR_PASSWORD
	:config sync.target 5

If synchronisation does not work, please consult the logs in the app profile directory - it is often due to a misconfigured URL or password. The log should indicate what the exact issue is.

## WebDAV synchronisation

Select the "WebDAV" synchronisation target and follow the same instructions as for Nextcloud above (for the **terminal application** you will need to select sync target 6 rather than 5)

WebDAV-compatible services that are known to work with Joplin:

- [Apache WebDAV Module](https://httpd.apache.org/docs/current/mod/mod_dav.html)
- [DriveHQ](https://www.drivehq.com)
- [Fastmail](https://www.fastmail.com/)
- [HiDrive](https://www.strato.fr/stockage-en-ligne/) from Strato. [Setup help](https://github.com/laurent22/joplin/issues/309)
- [Nginx WebDAV Module](https://nginx.org/en/docs/http/ngx_http_dav_module.html)
- [Nextcloud](https://nextcloud.com/)
- [OwnCloud](https://owncloud.org/)
- [Seafile](https://www.seafile.com/)
- [Stack](https://www.transip.nl/stack/)
- [Synology WebDAV Server](https://www.synology.com/en-us/dsm/packages/WebDAVServer)
- [WebDAV Nav](https://www.schimera.com/products/webdav-nav-server/), a macOS server.
- [Zimbra](https://www.zimbra.com/)

## Dropbox synchronisation

When syncing with Dropbox, Joplin creates a sub-directory in Dropbox, in `/Apps/Joplin` and reads/writes the notes and notebooks in it. The application does not have access to anything outside this directory.

In the **desktop application** or **mobile application**, select "Dropbox" as the synchronisation target in the [Configuration screen](https://github.com/laurent22/joplin/blob/dev/readme/config_screen.md) (it is selected by default). Then, to initiate the synchronisation process, click on the "Synchronise" button in the sidebar and follow the instructions.

In the **terminal application**, to initiate the synchronisation process, type `:sync`. You will be asked to follow a link to authorise the application.

## OneDrive synchronisation

When syncing with OneDrive, Joplin creates a sub-directory in OneDrive, in /Apps/Joplin and reads/writes the notes and notebooks in it. The application does not have access to anything outside this directory.

In the **desktop application** or **mobile application**, select "OneDrive" as the synchronisation target in the [Configuration screen](https://github.com/laurent22/joplin/blob/dev/readme/config_screen.md). Then, to initiate the synchronisation process, click on the "Synchronise" button in the sidebar and follow the instructions.

In the **terminal application**, to initiate the synchronisation process, type `:sync`. You will be asked to follow a link to authorise the application (simply input your Microsoft credentials - you do not need to register with OneDrive).

## S3 synchronisation

As of Joplin 2.x.x, Joplin supports multiple S3 providers. We expose some options that will need to be configured depending on your provider of choice. We have tested with UpCloud, AWS, and Linode. others should work as well.

In the **desktop application** or **mobile application**, select "S3 (Beta)" as the synchronisation target in the [Configuration screen](https://github.com/laurent22/joplin/blob/dev/readme/config_screen.md).

- **S3 Bucket:** The name of your Bucket, such as `joplin-bucket`
- **S3 URL:** Fully qualified URL; For AWS this should be `https://s3.<regionName>.amazonaws.com/`
- **S3 Access Key & S3 Secret Key:**  The User's programmatic access key.  To create a new key & secret on AWS, visit [IAM Security Credentials](https://console.aws.amazon.com/iam/home#/security_credentials). For other providers follow their documentation.
- **S3 Region:** Some providers require you to provide the region of your bucket. This is usually in the form of "eu-west1" or something similar depending on your region. For providers that do not require a region, you can leave it blank.
- **Force Path Style**: This setting enables Joplin to talk to S3 providers using an older style S3 Path. Depending on your provider you may need to try with this on and off.


While creating a new Bucket for Joplin, disable **Bucket Versioning**, enable **Block all public access** and enable **Default encryption** with `Amazon S3 key (SSE-S3)`. Some providers do not expose these options, and it could create a syncing problem. Do attempt and report back so we can update the documentation appropriately.

To add a **Bucket Policy** from the AWS S3 Web Console, navigate to the **Permissions** tab. Temporarily disable **Block all public access**  to edit the Bucket policy, something along the lines of:
```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": [
                  "s3:ListBucket",
                  "s3:GetBucketLocation",
                  "s3:GetObject",
                  "s3:DeleteObject",
                  "s3:DeleteObjectVersion",
                  "s3:PutObject"
            ],
            "Resource": [
                "arn:aws:s3:::joplin-bucket",
                "arn:aws:s3:::joplin-bucket/*"
            ]
        }
    ]
}
```

### Configuration settings for tested providers

All providers will require a bucket, Access Key, and Secret Key.

If you provide a configuration and you receive "success!" on the "check config" then your S3 sync should work for your provider. If you do not receive success, you may need to adjust your settings, or save them, restart the app, and attempt a sync. This may reveal more clear error messaging that will help you deduce the problem.

### AWS
- URL: `https://s3.<region>.amazonaws.com/` (fill in your region, a complete list of endpoint adresses can be found [here](https://docs.aws.amazon.com/general/latest/gr/s3.html))
- Region: required
- Force Path Style: unchecked

### Linode
- URL: `https://<region>.linodeobjects.com` (region is in the URL provided by Linode; this URL is also the same as the URL provided by Linode with the bucket name removed)
- Region: Anything you want to type, can't be left empty
- Force Path Style: unchecked

### UpCloud
- URL: `https://<account>.<region>.upcloudobjects.com` (They will provide you with multiple URLs, the one that follows this pattern should work.)
- Region: required
- Force Path Style: unchecked

# Encryption

Joplin supports end-to-end encryption (E2EE) on all the applications. E2EE is a system where only the owner of the notes, notebooks, tags or resources can read them. It prevents potential eavesdroppers - including telecom providers, internet providers, and even the developers of Joplin from being able to access the data. Please see the [End-To-End Encryption Tutorial](https://github.com/laurent22/joplin/blob/dev/readme/e2ee.md) for more information about this feature and how to enable it.

For a more technical description, mostly relevant for development or to review the method being used, please see the [Encryption specification](https://github.com/laurent22/joplin/blob/dev/readme/spec/e2ee.md).

# Note history

The Joplin applications automatically save previous versions of your notes at regular intervals. These versions are synced across devices and can be viewed from the desktop application. To do so, click on the "Information" button on a note, then click on "Previous version of this note". From this screen you can view the previous versions of the note as well as restore any of them.

This feature can be disabled from the "Note history" section in the [Configuration screen](https://github.com/laurent22/joplin/blob/dev/readme/config_screen.md), and it is also possible to change for how long the history of a note is saved.

More information please see the [Note History page](https://github.com/laurent22/joplin/blob/dev/readme/note_history.md).

# External text editor

Joplin notes can be opened and edited using an external editor of your choice. It can be a simple text editor like Notepad++ or Sublime Text or an actual Markdown editor like Typora. In that case, images will also be displayed within the editor. To open the note in an external editor, click on the icon in the toolbar or press Ctrl+E (or Cmd+E). Your default text editor will be used to open the note. If needed, you can also specify the editor directly in the General Options, under "Text editor command".

# Attachments

Any kind of file can be attached to a note. In Markdown, links to these files are represented as a simple ID to the attachment, clicking on this link will open the file in the default application. In the case of audio, video and pdf files, these will be displayed inline with the note and so can be viewed or played within Joplin.

In the **desktop application**, files can be attached either by clicking the "Attach file" icon in the editor or via drag and drop. If you prefer to create a link to a local file instead, hold the ALT key while performing the drag and drop operation. You can also copy and paste images directly in the editor via Ctrl+V.

Resources that are not attached to any note will be automatically deleted in accordance to the [Note History](#note-history) settings.

**Important:** Resources larger than 10 MB are not currently supported on mobile. They will crash the application when synchronising so it is recommended not to attach such resources at the moment. The issue is being looked at.

## Downloading attachments

The way the attachments are downloaded during synchronisation can be customised in the [Configuration screen](https://github.com/laurent22/joplin/blob/dev/readme/config_screen.md), under "Attachment download behaviour". The default option ("Always") is to download all the attachments, all the time, so that the data is available even when the device is offline. There is also the option to download the attachments manually (option "Manual"), by clicking on it, or automatically (Option "Auto"), in which case the attachments are downloaded only when a note is opened. These options should help saving disk space and network bandwidth, especially on mobile.

# Notifications

In the desktop and mobile apps, an alarm can be associated with any to-do. It will be triggered at the given time by displaying a notification. How the notification will be displayed depends on the operating system since each has a different way to handle this. Please see below for the requirements for the desktop applications:

- **Windows**: >= 8. Make sure the Action Center is enabled on Windows. Task bar balloon for Windows < 8. Growl as fallback. Growl takes precedence over Windows balloons.
- **macOS**: >= 10.8 or Growl if earlier.
- **Linux**: `notify-send` tool, delivered through packages `notify-osd`, `libnotify-bin` or `libnotify-tools`. GNOME should have this by default, but install `libnotify-tools` if using KDE Plasma.

See [documentation and flow chart for reporter choice](https://github.com/mikaelbr/node-notifier/blob/master/DECISION_FLOW.md)

On mobile, the alarms will be displayed using the built-in notification system.

If for any reason the notifications do not work, please [open an issue](https://github.com/laurent22/joplin/issues).

# Sub-notebooks

Sub-notebooks allow organising multiple notebooks into a tree of notebooks. For example it can be used to regroup all the notebooks related to work, to family or to a particular project under a parent notebook.

![](https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/SubNotebooks.png)

- In the **desktop application**, to create a subnotebook, drag and drop it onto another notebook. To move it back to the root, drag and drop it on the "Notebooks" header. Currently only the desktop app can be used to organise the notebooks.
- The **mobile application** supports displaying and collapsing/expanding the tree of notebooks, however it does not currently support moving the subnotebooks to different notebooks.
- The **terminal app** supports displaying the tree of subnotebooks but it does not support collapsing/expanding them or moving the subnotebooks around.

# Markdown

Joplin uses and renders a Github-flavoured Markdown with a few variations and additions. In particular it adds math formula support, interactive checkboxes and support for note links. Joplin also supports Markdown plugins which allow enabling and disabling various advanced Markdown features. Have a look at the [Markdown Guide](https://github.com/laurent22/joplin/blob/dev/readme/markdown.md) for more information.

# Custom CSS

Rendered markdown can be customized by placing a userstyle file in the profile directory `~/.config/joplin-desktop/userstyle.css` (This path might be different on your device - check at the top of the `General` page of the [Configuration screen](https://github.com/laurent22/joplin/blob/dev/readme/config_screen.md) for the exact path). This file supports standard CSS syntax. Joplin ***must*** be restarted for the new css to be applied, please ensure that Joplin is not closing to the tray, but is actually exiting. Note that this file is used for both displaying the notes and printing the notes. Be aware how the CSS may look printed (for example, printing white text over a black background is usually not wanted).

The whole UI can be customized by placing a custom editor style file in the profile directory `~/.config/joplin-desktop/userchrome.css`.

Important: userstyle.css and userchrome.css are provided for your convenience, but they are advanced settings, and styles you define may break from one version to the next. If you want to use them, please know that it might require regular development work from you to keep them working. The Joplin team cannot make a commitment to keep the application HTML structure stable.

# Plugins

The **desktop app** has the ability to extend beyond its standard functionality by the way of plugins. These plugins adhere to the Joplin [plugin API](https://joplinapp.org/api/references/plugin_api/classes/joplin.html) and can be installed & configured within the application via the `Plugins` page of the [Configuration screen](https://github.com/laurent22/joplin/blob/dev/readme/config_screen.md).

From this menu you can search for plugins uploaded to the [Joplin plugins](https://github.com/joplin/plugins) repository as well as manual installation of plugins using a 'Joplin Plugin Archive' (*.jpl) file.  
Once the application is reloaded the plugins will appear within the plugins menu where they can be toggled on/off or removed entirely.

For more information see [Plugins](https://github.com/laurent22/joplin/blob/dev/readme/plugins.md)

# Searching

Joplin implements the SQLite Full Text Search (FTS4) extension. It means the content of all the notes is indexed in real time and search queries return results very fast. Both [Simple FTS Queries](https://www.sqlite.org/fts3.html#simple_fts_queries) and [Full-Text Index Queries](https://www.sqlite.org/fts3.html#full_text_index_queries) are supported. See below for the list of supported queries:

One caveat of SQLite FTS is that it does not support languages which do not use Latin word boundaries (spaces, tabs, punctuation). To solve this issue, Joplin has a custom search mode, that does not use FTS, but still has all of its features (multi term search, filters, etc.). One of its drawbacks is that it can get slow on larger note collections. Also, the sorting of the results will be less accurate, as the ranking algorithm (BM25) is, for now, only implemented for FTS. Finally, in this mode there are no restrictions on using the `*` wildcard (`swim*`, `*swim` and `ast*rix` all work). This search mode is currently enabled if one of the following languages are detected:
 - Chinese
 - Japanese
 - Korean
 - Thai

## Supported queries

Search type | Description | Example
------------|-------------|---------
Single word | Returns all the notes that contain this term. | For example, searching for `cat` will return all the notes that contain this exact word. Note: it will not return the notes that contain the substring - thus, for "cat", notes that contain "cataclysmic" or "prevaricate" will **not** be returned.
Multiple word | Returns all the notes that contain **all** these words, but not necessarily next to each other. | `dog cat` - will return any notes that contain the words "dog" and "cat" anywhere in the note, no necessarily in that order nor next to each other. It will **not** return results that contain "dog" or "cat" only.
Phrase | Add double quotes to return the notes that contain exactly this phrase. | `"shopping list"` - will return the notes that contain these **exact terms** next to each other and in this order. It will **not** return for example a note that contains "going shopping with my list".
Prefix | Add a wildcard to return all the notes that contain a term with a specified prefix. | `swim*` - will return all the notes that contain eg. "swim", but also "swimming", "swimsuit", etc. IMPORTANT: The wildcard **can only be at the end** - it will be ignored at the beginning of a word (eg. `*swim`) and will be treated as a literal asterisk in the middle of a word (eg. `ast*rix`)
Switch to basic search | One drawback of Full Text Search is that it ignores most non-alphabetical characters. However in some cases you might want to search for this too. To do that, you can use basic search. You switch to this mode by prefixing your search with a slash `/`. This won't provide the benefits of FTS but it will allow searching exactly for what you need. Note that it can also be much slower, even extremely slow, depending on your query. | `/"- [ ]"` - will return all the notes that contain unchecked checkboxes.

## Search filters

You can also use search filters to further restrict the search.

| Operator | Description | Example |
| --- | --- | --- |
|**-**|If placed before a text term, it excludes the notes that contain that term. You can also place it before a filter to negate it. |`-spam` searches for all notes without the word `spam`.<br>`office -trash` searches for all notes with the word `office` and without the word `trash`.|
|**any:**|Return notes that satisfy any/all of the required conditions. `any:0` is the default, which means all conditions must be satisfied.|`any:1 cat dog` will return notes that have the word `cat` or `dog`.<br>`any:0 cat dog` will return notes with both the words `cat` and `dog`. |
| **title:** <br> **body:**|Restrict your search to just the title or the body field.|`title:"hello world"` searches for notes whose title contains `hello` and `world`.<br>`title:hello -body:world` searches for notes whose title contains `hello` and body does not contain `world`.
| **tag:** |Restrict the search to the notes with the specified tags.|`tag:office` searches for all notes having tag office.<br>`tag:office tag:important` searches for all notes having both office and important tags.<br>`tag:office -tag:spam` searches for notes having tag `office` which do not have tag `spam`.<br>`any:1 tag:office tag:spam` searches for notes having tag `office` or tag `spam`.<br>`tag:be*ful` does a search with wildcards.<br>`tag:*` returns all notes with tags.<br>`-tag:*` returns all notes without tags.|
| **notebook:** | Restrict the search to the specified notebook(s). |`notebook:books` limits the search scope within `books` and all its subnotebooks.<br>`notebook:wheel*time` does a wildcard search.|
| **created:** <br> **updated:** <br> **due:**| Searches for notes created/updated on dates specified using YYYYMMDD format. You can also search relative to the current day, week, month, or year. | `created:20201218` will return notes created on or after December 18, 2020.<br>`-updated:20201218` will return notes updated before December 18, 2020.<br>`created:20200118 -created:20201215` will return notes created between January 18, 2020, and before December 15, 2020.<br>`created:202001 -created:202003` will return notes created on or after January and before March 2020.<br>`updated:1997 -updated:2020` will return all notes updated between the years 1997 and 2019.<br>`created:day-2` searches for all notes created in the past two days.<br>`updated:year-0` searches all notes updated in the current year.<br>`-due:day+7` will return all todos which are due or will be due in the next seven days.<br>`-due:day-5` searches all todos that are overdue for more than 5 days.|
| **type:** |Restrict the search to either notes or todos. | `type:note` to return all notes<br>`type:todo` to return all todos |
| **iscompleted:** | Restrict the search to either completed or uncompleted todos. | `iscompleted:1` to return all completed todos<br>`iscompleted:0` to return all uncompleted todos|
|**latitude:** <br> **longitude:** <br> **altitude:**|Filter by location|`latitude:40 -latitude:50` to return notes with latitude >= 40 and < 50  |
|**resource:**|Filter by attachment MIME type|`resource:image/jpeg` to return notes with a jpeg attachment.<br>`-resource:application/pdf` to return notes without a pdf attachment.<br>`resource:image/*` to return notes with any images.|
|**sourceurl:**|Filter by source URL|`sourceurl:https://www.google.com`<br>`sourceurl:*joplinapp.org` to perform a wildcard search.|
|**id:**|Filter by note ID|`id:9cbc1b4f242043a9b8a50627508bccd5` return a note with the specified id |

Note: In the CLI client you have to escape the query using `--` when using negated filters.
Eg. `:search -- "-tag:tag1"`.

The filters are implicitly connected by and/or connectives depending on the following rules:

- By default, all filters are connected by "AND".
- To override this default behaviour, use the `any` filter, in which case the search terms will be connected by "OR" instead.
- There's an exception for the `notebook` filters which are connected by "OR". The reason being that no note can be in multiple notebooks at once.

Incorrect search filters are interpreted as a phrase search, e.g. misspelled `nootebook:Example` or non-existing `https://joplinapp.org`.

## Search order

Notes are sorted by "relevance". Currently it means the notes that contain the requested terms the most times are on top. For queries with multiple terms, it also matters how close to each other the terms are. This is a bit experimental so if you notice a search query that returns unexpected results, please report it in the forum, providing as many details as possible to replicate the issue.

# Goto Anything

In the desktop application, press <kbd>Ctrl+P</kbd> or <kbd>Cmd+P</kbd> and type a note title or part of its content to jump to it. Or type <kbd>#</kbd> followed by a tag name, or <kbd>@</kbd> followed by a notebook name.

# Multiple profile support
	
To create a new profile, open File > Switch profile and select Create new profile, enter the profile name and press OK. The app will automatically switch to this new profile, which you can now configure.

To switch back to the previous profile, again open File > Switch profile and select Default.

Note that profiles all share certain settings, such as language, font size, theme, etc. This is done so that you don't have reconfigure every details when switching profiles. Other settings such as sync configuration is per profile.

The feature is available on desktop only for now, and should be ported to mobile relatively soon.
	
# Donations

Donations to Joplin support the development of the project. Developing quality applications mostly takes time, but there are also some expenses, such as digital certificates to sign the applications, app store fees, hosting, etc. Most of all, your donation will make it possible to keep up the current development standard.

Please see the [donation page](https://github.com/laurent22/joplin/blob/dev/readme/donate.md) for information on how to support the development of Joplin.

# Community

Name | Description
--- | ---
[Support Forum](https://discourse.joplinapp.org/) | This is the main place for general discussion about Joplin, user support, software development questions, and to discuss new features. Also where the latest beta versions are released and discussed.
[Twitter feed](https://twitter.com/joplinapp) | Follow us on Twitter
[Mastodon feed](https://mastodon.social/@joplinapp) | Follow us on Mastodon
[Patreon page](https://www.patreon.com/joplin) |The latest news are often posted there
[Discord server](https://discord.gg/VSj7AFHvpq) | Our chat server
[Sub-reddit](https://www.reddit.com/r/joplinapp/) | Also a good place to get help

# Contributing

Please see the guide for information on how to contribute to the development of Joplin: https://github.com/laurent22/joplin/blob/dev/CONTRIBUTING.md

# Localisation

Joplin is currently available in the languages below. If you would like to contribute a **new translation**, it is quite straightforward, please follow these steps:

- [Download Poedit](https://poedit.net/), the translation editor, and install it.
- [Download the file to be translated](https://raw.githubusercontent.com/laurent22/joplin/dev/packages/tools/locales/joplin.pot).
- In Poedit, open this .pot file, go into the Catalog menu and click Configuration. Change "Country" and "Language" to your own country and language.
- From then you can translate the file.
- Once it is done, please [open a pull request](https://github.com/laurent22/joplin/pulls) and add the file to it.

This translation will apply to the three applications - desktop, mobile and terminal.

To **update a translation**, follow the same steps as above but instead of getting the .pot file, get the .po file for your language from the table below.

Current translations:

<!-- LOCALE-TABLE-AUTO-GENERATED -->
&nbsp;  |  Language  |  Po File  |  Last translator  |  Percent done
---|---|---|---|---
<img src="https://joplinapp.org/images/flags/country-4x3/arableague.png" width="16px"/>  |  Arabic  |  [ar](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/ar.po)  |  [Whaell O](mailto:Whaell@protonmail.com)  |  82%
<img src="https://joplinapp.org/images/flags/es/basque_country.png" width="16px"/>  |  Basque  |  [eu](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/eu.po)  |  juan.abasolo@ehu.eus  |  23%
<img src="https://joplinapp.org/images/flags/country-4x3/ba.png" width="16px"/>  |  Bosnian (Bosna i Hercegovina)  |  [bs_BA](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/bs_BA.po)  |  [Derviš T.](mailto:dervis.t@pm.me)  |  59%
<img src="https://joplinapp.org/images/flags/country-4x3/bg.png" width="16px"/>  |  Bulgarian (България)  |  [bg_BG](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/bg_BG.po)  |    |  46%
<img src="https://joplinapp.org/images/flags/es/catalonia.png" width="16px"/>  |  Catalan  |  [ca](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/ca.po)  |  [Xavi Ivars](mailto:xavi.ivars@gmail.com)  |  92%
<img src="https://joplinapp.org/images/flags/country-4x3/hr.png" width="16px"/>  |  Croatian (Hrvatska)  |  [hr_HR](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/hr_HR.po)  |  [Milo Ivir](mailto:mail@milotype.de)  |  92%
<img src="https://joplinapp.org/images/flags/country-4x3/cz.png" width="16px"/>  |  Czech (Česká republika)  |  [cs_CZ](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/cs_CZ.po)  |  [Michal Stanke](mailto:michal@stanke.cz)  |  79%
<img src="https://joplinapp.org/images/flags/country-4x3/dk.png" width="16px"/>  |  Dansk (Danmark)  |  [da_DK](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/da_DK.po)  |  ERYpTION  |  98%
<img src="https://joplinapp.org/images/flags/country-4x3/de.png" width="16px"/>  |  Deutsch (Deutschland)  |  [de_DE](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/de_DE.po)  |  [MrKanister](mailto:pueblos_spatulas@aleeas.com)  |  98%
<img src="https://joplinapp.org/images/flags/country-4x3/ee.png" width="16px"/>  |  Eesti Keel (Eesti)  |  [et_EE](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/et_EE.po)  |    |  46%
<img src="https://joplinapp.org/images/flags/country-4x3/gb.png" width="16px"/>  |  English (United Kingdom)  |  [en_GB](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/en_GB.po)  |    |  100%
<img src="https://joplinapp.org/images/flags/country-4x3/us.png" width="16px"/>  |  English (United States of America)  |  [en_US](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/en_US.po)  |    |  100%
<img src="https://joplinapp.org/images/flags/country-4x3/es.png" width="16px"/>  |  Español (España)  |  [es_ES](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/es_ES.po)  |  [Francisco Mora](mailto:francisco.m.collao@gmail.com)  |  91%
<img src="https://joplinapp.org/images/flags/esperanto.png" width="16px"/>  |  Esperanto  |  [eo](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/eo.po)  |  Marton Paulo  |  26%
<img src="https://joplinapp.org/images/flags/country-4x3/fi.png" width="16px"/>  |  Finnish (Suomi)  |  [fi_FI](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/fi_FI.po)  |  mrkaato0  |  98%
<img src="https://joplinapp.org/images/flags/country-4x3/fr.png" width="16px"/>  |  Français (France)  |  [fr_FR](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/fr_FR.po)  |  Laurent Cozic  |  98%
<img src="https://joplinapp.org/images/flags/es/galicia.png" width="16px"/>  |  Galician (España)  |  [gl_ES](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/gl_ES.po)  |  [Marcos Lans](mailto:marcoslansgarza@gmail.com)  |  30%
<img src="https://joplinapp.org/images/flags/country-4x3/id.png" width="16px"/>  |  Indonesian (Indonesia)  |  [id_ID](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/id_ID.po)  |  [Wisnu Adi Santoso](mailto:waditos@gmail.com)  |  92%
<img src="https://joplinapp.org/images/flags/country-4x3/it.png" width="16px"/>  |  Italiano (Italia)  |  [it_IT](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/it_IT.po)  |  [Albano Battistella](mailto:albano_battistella@hotmail.com)  |  80%
<img src="https://joplinapp.org/images/flags/country-4x3/hu.png" width="16px"/>  |  Magyar (Magyarország)  |  [hu_HU](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/hu_HU.po)  |  [Magyari Balázs](mailto:balmag@gmail.com)  |  80%
<img src="https://joplinapp.org/images/flags/country-4x3/be.png" width="16px"/>  |  Nederlands (België, Belgique, Belgien)  |  [nl_BE](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/nl_BE.po)  |    |  81%
<img src="https://joplinapp.org/images/flags/country-4x3/nl.png" width="16px"/>  |  Nederlands (Nederland)  |  [nl_NL](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/nl_NL.po)  |  [MHolkamp](mailto:mholkamp@users.noreply.github.com)  |  91%
<img src="https://joplinapp.org/images/flags/country-4x3/no.png" width="16px"/>  |  Norwegian (Norge, Noreg)  |  [nb_NO](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/nb_NO.po)  |  [Mats Estensen](mailto:code@mxe.no)  |  91%
<img src="https://joplinapp.org/images/flags/country-4x3/ir.png" width="16px"/>  |  Persian  |  [fa](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/fa.po)  |  [Kourosh Firoozbakht](mailto:kourox@protonmail.com)  |  57%
<img src="https://joplinapp.org/images/flags/country-4x3/pl.png" width="16px"/>  |  Polski (Polska)  |  [pl_PL](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/pl_PL.po)  |  [X3NO](mailto:X3NO@disroot.org)  |  92%
<img src="https://joplinapp.org/images/flags/country-4x3/br.png" width="16px"/>  |  Português (Brasil)  |  [pt_BR](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/pt_BR.po)  |  [Renato Nunes Bastos](mailto:rnbastos@gmail.com)  |  91%
<img src="https://joplinapp.org/images/flags/country-4x3/pt.png" width="16px"/>  |  Português (Portugal)  |  [pt_PT](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/pt_PT.po)  |  [Diogo Caveiro](mailto:dcaveiro@yahoo.com)  |  75%
<img src="https://joplinapp.org/images/flags/country-4x3/ro.png" width="16px"/>  |  Română  |  [ro](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/ro.po)  |  [Cristi Duluta](mailto:cristi.duluta@gmail.com)  |  52%
<img src="https://joplinapp.org/images/flags/country-4x3/si.png" width="16px"/>  |  Slovenian (Slovenija)  |  [sl_SI](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/sl_SI.po)  |  [Martin Korelič](mailto:martin.korelic@protonmail.com)  |  83%
<img src="https://joplinapp.org/images/flags/country-4x3/se.png" width="16px"/>  |  Svenska  |  [sv](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/sv.po)  |  [Jonatan Nyberg](mailto:jonatan@autistici.org)  |  92%
<img src="https://joplinapp.org/images/flags/country-4x3/th.png" width="16px"/>  |  Thai (ประเทศไทย)  |  [th_TH](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/th_TH.po)  |    |  38%
<img src="https://joplinapp.org/images/flags/country-4x3/vn.png" width="16px"/>  |  Tiếng Việt  |  [vi](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/vi.po)  |    |  80%
<img src="https://joplinapp.org/images/flags/country-4x3/tr.png" width="16px"/>  |  Türkçe (Türkiye)  |  [tr_TR](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/tr_TR.po)  |  [Arda Kılıçdağı](mailto:arda@kilicdagi.com)  |  92%
<img src="https://joplinapp.org/images/flags/country-4x3/ua.png" width="16px"/>  |  Ukrainian (Україна)  |  [uk_UA](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/uk_UA.po)  |  [Vyacheslav Andreykiv](mailto:vandreykiv@gmail.com)  |  75%
<img src="https://joplinapp.org/images/flags/country-4x3/gr.png" width="16px"/>  |  Ελληνικά (Ελλάδα)  |  [el_GR](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/el_GR.po)  |  [Harris Arvanitis](mailto:xaris@tuta.io)  |  91%
<img src="https://joplinapp.org/images/flags/country-4x3/ru.png" width="16px"/>  |  Русский (Россия)  |  [ru_RU](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/ru_RU.po)  |  [Sergey Segeda](mailto:thesermanarm@gmail.com)  |  83%
<img src="https://joplinapp.org/images/flags/country-4x3/rs.png" width="16px"/>  |  српски језик (Србија)  |  [sr_RS](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/sr_RS.po)  |    |  67%
<img src="https://joplinapp.org/images/flags/country-4x3/cn.png" width="16px"/>  |  中文 (简体)  |  [zh_CN](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/zh_CN.po)  |  [KaneGreen](mailto:737445366KG@Gmail.com)  |  96%
<img src="https://joplinapp.org/images/flags/country-4x3/tw.png" width="16px"/>  |  中文 (繁體)  |  [zh_TW](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/zh_TW.po)  |  [Kevin Hsu](mailto:kevin.hsu.hws@gmail.com)  |  92%
<img src="https://joplinapp.org/images/flags/country-4x3/jp.png" width="16px"/>  |  日本語 (日本)  |  [ja_JP](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/ja_JP.po)  |  [genneko](mailto:genneko217@gmail.com)  |  92%
<img src="https://joplinapp.org/images/flags/country-4x3/kr.png" width="16px"/>  |  한국어  |  [ko](https://github.com/laurent22/joplin/blob/dev/packages/tools/locales/ko.po)  |  [Ji-Hyeon Gim](mailto:potatogim@potatogim.net)  |  92%
<!-- LOCALE-TABLE-AUTO-GENERATED -->

# Contributors

Thank you to everyone who've contributed to Joplin's source code!

<!-- CONTRIBUTORS-TABLE-AUTO-GENERATED -->
|     |     |     |     |     |
| :---: | :---: | :---: | :---: | :---: |
| <img width="50" src="https://avatars.githubusercontent.com/u/1285584?v=4"/></br>[laurent22](https://github.com/laurent22) | <img width="50" src="https://avatars.githubusercontent.com/u/223439?v=4"/></br>[tessus](https://github.com/tessus) | <img width="50" src="https://avatars.githubusercontent.com/u/2179547?v=4"/></br>[CalebJohn](https://github.com/CalebJohn) | <img width="50" src="https://avatars.githubusercontent.com/u/1732810?v=4"/></br>[mic704b](https://github.com/mic704b) | <img width="50" src="https://avatars.githubusercontent.com/u/995612?v=4"/></br>[roman-r-m](https://github.com/roman-r-m) |
| <img width="50" src="https://avatars.githubusercontent.com/u/29672555?v=4"/></br>[genneko](https://github.com/genneko) | <img width="50" src="https://avatars.githubusercontent.com/u/63491353?v=4"/></br>[j-krl](https://github.com/j-krl) | <img width="50" src="https://avatars.githubusercontent.com/u/4553672?v=4"/></br>[tanrax](https://github.com/tanrax) | <img width="50" src="https://avatars.githubusercontent.com/u/30305957?v=4"/></br>[naviji](https://github.com/naviji) | <img width="50" src="https://avatars.githubusercontent.com/u/3542031?v=4"/></br>[PackElend](https://github.com/PackElend) |
| <img width="50" src="https://avatars.githubusercontent.com/u/8701534?v=4"/></br>[rtmkrlv](https://github.com/rtmkrlv) | <img width="50" src="https://avatars.githubusercontent.com/u/10997189?v=4"/></br>[fmrtn](https://github.com/fmrtn) | <img width="50" src="https://avatars.githubusercontent.com/u/4374338?v=4"/></br>[potatogim](https://github.com/potatogim) | <img width="50" src="https://avatars.githubusercontent.com/u/6979755?v=4"/></br>[devonzuegel](https://github.com/devonzuegel) | <img width="50" src="https://avatars.githubusercontent.com/u/26695184?v=4"/></br>[anjulalk](https://github.com/anjulalk) |
| <img width="50" src="https://avatars.githubusercontent.com/u/16101778?v=4"/></br>[gabcoh](https://github.com/gabcoh) | <img width="50" src="https://avatars.githubusercontent.com/u/10927304?v=4"/></br>[matsest](https://github.com/matsest) | <img width="50" src="https://avatars.githubusercontent.com/u/6319051?v=4"/></br>[abonte](https://github.com/abonte) | <img width="50" src="https://avatars.githubusercontent.com/u/1685517?v=4"/></br>[Abijeet](https://github.com/Abijeet) | <img width="50" src="https://avatars.githubusercontent.com/u/27751740?v=4"/></br>[ishantgupta777](https://github.com/ishantgupta777) |
| <img width="50" src="https://avatars.githubusercontent.com/u/24863925?v=4"/></br>[JackGruber](https://github.com/JackGruber) | <img width="50" src="https://avatars.githubusercontent.com/u/2063957?v=4"/></br>[Ardakilic](https://github.com/Ardakilic) | <img width="50" src="https://avatars.githubusercontent.com/u/44024553?v=4"/></br>[rabeehrz](https://github.com/rabeehrz) | <img width="50" src="https://avatars.githubusercontent.com/u/35633575?v=4"/></br>[coderrsid](https://github.com/coderrsid) | <img width="50" src="https://avatars.githubusercontent.com/u/208212?v=4"/></br>[foxmask](https://github.com/foxmask) |
| <img width="50" src="https://avatars.githubusercontent.com/u/6557454?v=4"/></br>[innocuo](https://github.com/innocuo) | <img width="50" src="https://avatars.githubusercontent.com/u/54268438?v=4"/></br>[Rahulm2310](https://github.com/Rahulm2310) | <img width="50" src="https://avatars.githubusercontent.com/u/1904967?v=4"/></br>[readingsnail](https://github.com/readingsnail) | <img width="50" src="https://avatars.githubusercontent.com/u/7415668?v=4"/></br>[mablin7](https://github.com/mablin7) | <img width="50" src="https://avatars.githubusercontent.com/u/3985557?v=4"/></br>[XarisA](https://github.com/XarisA) |
| <img width="50" src="https://avatars.githubusercontent.com/u/49979415?v=4"/></br>[jonath92](https://github.com/jonath92) | <img width="50" src="https://avatars.githubusercontent.com/u/4237724?v=4"/></br>[alexdevero](https://github.com/alexdevero) | <img width="50" src="https://avatars.githubusercontent.com/u/35904727?v=4"/></br>[Runo-saduwa](https://github.com/Runo-saduwa) | <img width="50" src="https://avatars.githubusercontent.com/u/5365582?v=4"/></br>[marcosvega91](https://github.com/marcosvega91) | <img width="50" src="https://avatars.githubusercontent.com/u/37639389?v=4"/></br>[petrz12](https://github.com/petrz12) |
| <img width="50" src="https://avatars.githubusercontent.com/u/51550769?v=4"/></br>[rnbastos](https://github.com/rnbastos) | <img width="50" src="https://avatars.githubusercontent.com/u/32396?v=4"/></br>[ProgramFan](https://github.com/ProgramFan) | <img width="50" src="https://avatars.githubusercontent.com/u/4245227?v=4"/></br>[zblesk](https://github.com/zblesk) | <img width="50" src="https://avatars.githubusercontent.com/u/5730052?v=4"/></br>[vsimkus](https://github.com/vsimkus) | <img width="50" src="https://avatars.githubusercontent.com/u/3194829?v=4"/></br>[moltenform](https://github.com/moltenform) |
| <img width="50" src="https://avatars.githubusercontent.com/u/36989112?v=4"/></br>[nishantwrp](https://github.com/nishantwrp) | <img width="50" src="https://avatars.githubusercontent.com/u/5199995?v=4"/></br>[zuphilip](https://github.com/zuphilip) | <img width="50" src="https://avatars.githubusercontent.com/u/54576074?v=4"/></br>[Rishabh-malhotraa](https://github.com/Rishabh-malhotraa) | <img width="50" src="https://avatars.githubusercontent.com/u/559346?v=4"/></br>[metbril](https://github.com/metbril) | <img width="50" src="https://avatars.githubusercontent.com/u/47623588?v=4"/></br>[WhiredPlanck](https://github.com/WhiredPlanck) |
| <img width="50" src="https://avatars.githubusercontent.com/u/43657314?v=4"/></br>[milotype](https://github.com/milotype) | <img width="50" src="https://avatars.githubusercontent.com/u/32196447?v=4"/></br>[yaozeye](https://github.com/yaozeye) | <img width="50" src="https://avatars.githubusercontent.com/u/12264626?v=4"/></br>[ylc395](https://github.com/ylc395) | <img width="50" src="https://avatars.githubusercontent.com/u/17768566?v=4"/></br>[RenatoXSR](https://github.com/RenatoXSR) | <img width="50" src="https://avatars.githubusercontent.com/u/54888685?v=4"/></br>[RedDocMD](https://github.com/RedDocMD) |
| <img width="50" src="https://avatars.githubusercontent.com/u/31567272?v=4"/></br>[q1011](https://github.com/q1011) | <img width="50" src="https://avatars.githubusercontent.com/u/12906090?v=4"/></br>[amitsin6h](https://github.com/amitsin6h) | <img width="50" src="https://avatars.githubusercontent.com/u/628474?v=4"/></br>[Atalanttore](https://github.com/Atalanttore) | <img width="50" src="https://avatars.githubusercontent.com/u/42747216?v=4"/></br>[Mannivu](https://github.com/Mannivu) | <img width="50" src="https://avatars.githubusercontent.com/u/23281486?v=4"/></br>[martonpaulo](https://github.com/martonpaulo) |
| <img width="50" src="https://avatars.githubusercontent.com/u/390889?v=4"/></br>[mmahmoudian](https://github.com/mmahmoudian) | <img width="50" src="https://avatars.githubusercontent.com/u/4497566?v=4"/></br>[rccavalcanti](https://github.com/rccavalcanti) | <img width="50" src="https://avatars.githubusercontent.com/u/1540054?v=4"/></br>[ShaneKilkelly](https://github.com/ShaneKilkelly) | <img width="50" src="https://avatars.githubusercontent.com/u/7091080?v=4"/></br>[sinkuu](https://github.com/sinkuu) | <img width="50" src="https://avatars.githubusercontent.com/u/6734573?v=4"/></br>[stweil](https://github.com/stweil) |
| <img width="50" src="https://avatars.githubusercontent.com/u/692072?v=4"/></br>[conyx](https://github.com/conyx) | <img width="50" src="https://avatars.githubusercontent.com/u/49116134?v=4"/></br>[anihm136](https://github.com/anihm136) | <img width="50" src="https://avatars.githubusercontent.com/u/937861?v=4"/></br>[archont00](https://github.com/archont00) | <img width="50" src="https://avatars.githubusercontent.com/u/32770029?v=4"/></br>[bradmcl](https://github.com/bradmcl) | <img width="50" src="https://avatars.githubusercontent.com/u/22592201?v=4"/></br>[tfinnberg](https://github.com/tfinnberg) |
| <img width="50" src="https://avatars.githubusercontent.com/u/8716226?v=4"/></br>[amandamcg](https://github.com/amandamcg) | <img width="50" src="https://avatars.githubusercontent.com/u/3870964?v=4"/></br>[marcushill](https://github.com/marcushill) | <img width="50" src="https://avatars.githubusercontent.com/u/102242?v=4"/></br>[nathanleiby](https://github.com/nathanleiby) | <img width="50" src="https://avatars.githubusercontent.com/u/226708?v=4"/></br>[RaphaelKimmig](https://github.com/RaphaelKimmig) | <img width="50" src="https://avatars.githubusercontent.com/u/20461071?v=4"/></br>[Vaso3](https://github.com/Vaso3) |
| <img width="50" src="https://avatars.githubusercontent.com/u/36303913?v=4"/></br>[sensor-freak](https://github.com/sensor-freak) | <img width="50" src="https://avatars.githubusercontent.com/u/63918341?v=4"/></br>[lkiThakur](https://github.com/lkiThakur) | <img width="50" src="https://avatars.githubusercontent.com/u/28987176?v=4"/></br>[infinity052](https://github.com/infinity052) | <img width="50" src="https://avatars.githubusercontent.com/u/21161146?v=4"/></br>[BartBucknill](https://github.com/BartBucknill) | <img width="50" src="https://avatars.githubusercontent.com/u/2494769?v=4"/></br>[mrwulf](https://github.com/mrwulf) |
| <img width="50" src="https://avatars.githubusercontent.com/u/560571?v=4"/></br>[chrisb86](https://github.com/chrisb86) | <img width="50" src="https://avatars.githubusercontent.com/u/1686759?v=4"/></br>[chrmoritz](https://github.com/chrmoritz) | <img width="50" src="https://avatars.githubusercontent.com/u/58074586?v=4"/></br>[Daeraxa](https://github.com/Daeraxa) | <img width="50" src="https://avatars.githubusercontent.com/u/71190696?v=4"/></br>[Elaborendum](https://github.com/Elaborendum) | <img width="50" src="https://avatars.githubusercontent.com/u/5001259?v=4"/></br>[ethan42411](https://github.com/ethan42411) |
| <img width="50" src="https://avatars.githubusercontent.com/u/2733783?v=4"/></br>[JOJ0](https://github.com/JOJ0) | <img width="50" src="https://avatars.githubusercontent.com/u/17108695?v=4"/></br>[jalajcodes](https://github.com/jalajcodes) | <img width="50" src="https://avatars.githubusercontent.com/u/238088?v=4"/></br>[jblunck](https://github.com/jblunck) | <img width="50" src="https://avatars.githubusercontent.com/u/3140223?v=4"/></br>[jdrobertso](https://github.com/jdrobertso) | <img width="50" src="https://avatars.githubusercontent.com/u/37297218?v=4"/></br>[Jesssullivan](https://github.com/Jesssullivan) |
| <img width="50" src="https://avatars.githubusercontent.com/u/339645?v=4"/></br>[jmontane](https://github.com/jmontane) | <img width="50" src="https://avatars.githubusercontent.com/u/69011?v=4"/></br>[johanhammar](https://github.com/johanhammar) | <img width="50" src="https://avatars.githubusercontent.com/u/4168339?v=4"/></br>[solariz](https://github.com/solariz) | <img width="50" src="https://avatars.githubusercontent.com/u/25288?v=4"/></br>[maicki](https://github.com/maicki) | <img width="50" src="https://avatars.githubusercontent.com/u/2136373?v=4"/></br>[mjjzf](https://github.com/mjjzf) |
| <img width="50" src="https://avatars.githubusercontent.com/u/27608187?v=4"/></br>[rt-oliveira](https://github.com/rt-oliveira) | <img width="50" src="https://avatars.githubusercontent.com/u/2486806?v=4"/></br>[sebastienjust](https://github.com/sebastienjust) | <img width="50" src="https://avatars.githubusercontent.com/u/28362310?v=4"/></br>[sealch](https://github.com/sealch) | <img width="50" src="https://avatars.githubusercontent.com/u/34258070?v=4"/></br>[StarFang208](https://github.com/StarFang208) | <img width="50" src="https://avatars.githubusercontent.com/u/59690052?v=4"/></br>[Subhra264](https://github.com/Subhra264) |
| <img width="50" src="https://avatars.githubusercontent.com/u/1782292?v=4"/></br>[SubodhDahal](https://github.com/SubodhDahal) | <img width="50" src="https://avatars.githubusercontent.com/u/5912371?v=4"/></br>[TobiasDev](https://github.com/TobiasDev) | <img width="50" src="https://avatars.githubusercontent.com/u/13502069?v=4"/></br>[Whaell](https://github.com/Whaell) | <img width="50" src="https://avatars.githubusercontent.com/u/29891001?v=4"/></br>[jyuvaraj03](https://github.com/jyuvaraj03) | <img width="50" src="https://avatars.githubusercontent.com/u/15380913?v=4"/></br>[kowalskidev](https://github.com/kowalskidev) |
| <img width="50" src="https://avatars.githubusercontent.com/u/337455?v=4"/></br>[alexchee](https://github.com/alexchee) | <img width="50" src="https://avatars.githubusercontent.com/u/5077221?v=4"/></br>[axq](https://github.com/axq) | <img width="50" src="https://avatars.githubusercontent.com/u/8808502?v=4"/></br>[barbowza](https://github.com/barbowza) | <img width="50" src="https://avatars.githubusercontent.com/u/42007357?v=4"/></br>[eresytter](https://github.com/eresytter) | <img width="50" src="https://avatars.githubusercontent.com/u/4316805?v=4"/></br>[lightray22](https://github.com/lightray22) |
| <img width="50" src="https://avatars.githubusercontent.com/u/11711053?v=4"/></br>[lscolombo](https://github.com/lscolombo) | <img width="50" src="https://avatars.githubusercontent.com/u/36228623?v=4"/></br>[mrkaato](https://github.com/mrkaato) | <img width="50" src="https://avatars.githubusercontent.com/u/17399340?v=4"/></br>[pf-siedler](https://github.com/pf-siedler) | <img width="50" src="https://avatars.githubusercontent.com/u/17232523?v=4"/></br>[ruuti](https://github.com/ruuti) | <img width="50" src="https://avatars.githubusercontent.com/u/23638148?v=4"/></br>[s1nceri7y](https://github.com/s1nceri7y) |
| <img width="50" src="https://avatars.githubusercontent.com/u/10117386?v=4"/></br>[kornava](https://github.com/kornava) | <img width="50" src="https://avatars.githubusercontent.com/u/7471938?v=4"/></br>[ShuiHuo](https://github.com/ShuiHuo) | <img width="50" src="https://avatars.githubusercontent.com/u/11596277?v=4"/></br>[ikunya](https://github.com/ikunya) | <img width="50" src="https://avatars.githubusercontent.com/u/8184424?v=4"/></br>[Ahmad45123](https://github.com/Ahmad45123) | <img width="50" src="https://avatars.githubusercontent.com/u/59133880?v=4"/></br>[bedwardly-down](https://github.com/bedwardly-down) |
| <img width="50" src="https://avatars.githubusercontent.com/u/50335724?v=4"/></br>[dcaveiro](https://github.com/dcaveiro) | <img width="50" src="https://avatars.githubusercontent.com/u/47456195?v=4"/></br>[hexclover](https://github.com/hexclover) | <img width="50" src="https://avatars.githubusercontent.com/u/45535789?v=4"/></br>[2jaeyeol](https://github.com/2jaeyeol) | <img width="50" src="https://avatars.githubusercontent.com/u/25622825?v=4"/></br>[thackeraaron](https://github.com/thackeraaron) | <img width="50" src="https://avatars.githubusercontent.com/u/15862474?v=4"/></br>[aaronxn](https://github.com/aaronxn) |
| <img width="50" src="https://avatars.githubusercontent.com/u/40672207?v=4"/></br>[xUser5000](https://github.com/xUser5000) | <img width="50" src="https://avatars.githubusercontent.com/u/56785486?v=4"/></br>[iamabhi222](https://github.com/iamabhi222) | <img width="50" src="https://avatars.githubusercontent.com/u/63443657?v=4"/></br>[Aksh-Konda](https://github.com/Aksh-Konda) | <img width="50" src="https://avatars.githubusercontent.com/u/3660978?v=4"/></br>[alanfortlink](https://github.com/alanfortlink) | <img width="50" src="https://avatars.githubusercontent.com/u/53372753?v=4"/></br>[AverageUser2](https://github.com/AverageUser2) |
| <img width="50" src="https://avatars.githubusercontent.com/u/4056990?v=4"/></br>[afischer211](https://github.com/afischer211) | <img width="50" src="https://avatars.githubusercontent.com/u/26230870?v=4"/></br>[a13xk](https://github.com/a13xk) | <img width="50" src="https://avatars.githubusercontent.com/u/14836659?v=4"/></br>[apankratov](https://github.com/apankratov) | <img width="50" src="https://avatars.githubusercontent.com/u/7045739?v=4"/></br>[teterkin](https://github.com/teterkin) | <img width="50" src="https://avatars.githubusercontent.com/u/215668?v=4"/></br>[avanderberg](https://github.com/avanderberg) |
| <img width="50" src="https://avatars.githubusercontent.com/u/41290751?v=4"/></br>[serenitatis](https://github.com/serenitatis) | <img width="50" src="https://avatars.githubusercontent.com/u/4408379?v=4"/></br>[lex111](https://github.com/lex111) | <img width="50" src="https://avatars.githubusercontent.com/u/60134194?v=4"/></br>[Alkindi42](https://github.com/Alkindi42) | <img width="50" src="https://avatars.githubusercontent.com/u/7129815?v=4"/></br>[Jumanjii](https://github.com/Jumanjii) | <img width="50" src="https://avatars.githubusercontent.com/u/19962243?v=4"/></br>[AlphaJack](https://github.com/AlphaJack) |
| <img width="50" src="https://avatars.githubusercontent.com/u/65647302?v=4"/></br>[Lord-Aman](https://github.com/Lord-Aman) | <img width="50" src="https://avatars.githubusercontent.com/u/14096959?v=4"/></br>[richtwin567](https://github.com/richtwin567) | <img width="50" src="https://avatars.githubusercontent.com/u/487182?v=4"/></br>[ajilderda](https://github.com/ajilderda) | <img width="50" src="https://avatars.githubusercontent.com/u/922429?v=4"/></br>[adrynov](https://github.com/adrynov) | <img width="50" src="https://avatars.githubusercontent.com/u/94937?v=4"/></br>[andrewperry](https://github.com/andrewperry) |
| <img width="50" src="https://avatars.githubusercontent.com/u/5417051?v=4"/></br>[tekdel](https://github.com/tekdel) | <img width="50" src="https://avatars.githubusercontent.com/u/54475686?v=4"/></br>[anshuman9999](https://github.com/anshuman9999) | <img width="50" src="https://avatars.githubusercontent.com/u/25694659?v=4"/></br>[rasklaad](https://github.com/rasklaad) | <img width="50" src="https://avatars.githubusercontent.com/u/17809291?v=4"/></br>[Technik-J](https://github.com/Technik-J) | <img width="50" src="https://avatars.githubusercontent.com/u/498326?v=4"/></br>[Shaxine](https://github.com/Shaxine) |
| <img width="50" src="https://avatars.githubusercontent.com/u/9095073?v=4"/></br>[antonio-ramadas](https://github.com/antonio-ramadas) | <img width="50" src="https://avatars.githubusercontent.com/u/28067395?v=4"/></br>[heyapoorva](https://github.com/heyapoorva) | <img width="50" src="https://avatars.githubusercontent.com/u/201215?v=4"/></br>[assimd](https://github.com/assimd) | <img width="50" src="https://avatars.githubusercontent.com/u/26827848?v=4"/></br>[Atrate](https://github.com/Atrate) | <img width="50" src="https://avatars.githubusercontent.com/u/60288895?v=4"/></br>[Beowulf2](https://github.com/Beowulf2) |
| <img width="50" src="https://avatars.githubusercontent.com/u/7034200?v=4"/></br>[bimlas](https://github.com/bimlas) | <img width="50" src="https://avatars.githubusercontent.com/u/47641641?v=4"/></br>[brenobaptista](https://github.com/brenobaptista) | <img width="50" src="https://avatars.githubusercontent.com/u/60824?v=4"/></br>[brttbndr](https://github.com/brttbndr) | <img width="50" src="https://avatars.githubusercontent.com/u/16287077?v=4"/></br>[carlbordum](https://github.com/carlbordum) | <img width="50" src="https://avatars.githubusercontent.com/u/20382?v=4"/></br>[carlosedp](https://github.com/carlosedp) |
| <img width="50" src="https://avatars.githubusercontent.com/u/105843?v=4"/></br>[chaifeng](https://github.com/chaifeng) | <img width="50" src="https://avatars.githubusercontent.com/u/549349?v=4"/></br>[charles-e](https://github.com/charles-e) | <img width="50" src="https://avatars.githubusercontent.com/u/19870089?v=4"/></br>[cyy5358](https://github.com/cyy5358) | <img width="50" src="https://avatars.githubusercontent.com/u/32337926?v=4"/></br>[Chillu1](https://github.com/Chillu1) | <img width="50" src="https://avatars.githubusercontent.com/u/2348463?v=4"/></br>[Techwolf12](https://github.com/Techwolf12) |
| <img width="50" src="https://avatars.githubusercontent.com/u/2282880?v=4"/></br>[cloudtrends](https://github.com/cloudtrends) | <img width="50" src="https://avatars.githubusercontent.com/u/17257053?v=4"/></br>[idcristi](https://github.com/idcristi) | <img width="50" src="https://avatars.githubusercontent.com/u/15956322?v=4"/></br>[damienmascre](https://github.com/damienmascre) | <img width="50" src="https://avatars.githubusercontent.com/u/1044056?v=4"/></br>[daniellandau](https://github.com/daniellandau) | <img width="50" src="https://avatars.githubusercontent.com/u/12847693?v=4"/></br>[danil-tolkachev](https://github.com/danil-tolkachev) |
| <img width="50" src="https://avatars.githubusercontent.com/u/7279100?v=4"/></br>[darshani28](https://github.com/darshani28) | <img width="50" src="https://avatars.githubusercontent.com/u/26189247?v=4"/></br>[daukadolt](https://github.com/daukadolt) | <img width="50" src="https://avatars.githubusercontent.com/u/28535750?v=4"/></br>[NeverMendel](https://github.com/NeverMendel) | <img width="50" src="https://avatars.githubusercontent.com/u/26790323?v=4"/></br>[dervist](https://github.com/dervist) | <img width="50" src="https://avatars.githubusercontent.com/u/11378282?v=4"/></br>[diego-betto](https://github.com/diego-betto) |
| <img width="50" src="https://avatars.githubusercontent.com/u/215270?v=4"/></br>[erdody](https://github.com/erdody) | <img width="50" src="https://avatars.githubusercontent.com/u/10371667?v=4"/></br>[domgoodwin](https://github.com/domgoodwin) | <img width="50" src="https://avatars.githubusercontent.com/u/72066?v=4"/></br>[b4mboo](https://github.com/b4mboo) | <img width="50" src="https://avatars.githubusercontent.com/u/5131923?v=4"/></br>[donbowman](https://github.com/donbowman) | <img width="50" src="https://avatars.githubusercontent.com/u/579727?v=4"/></br>[sirnacnud](https://github.com/sirnacnud) |
| <img width="50" src="https://avatars.githubusercontent.com/u/47756?v=4"/></br>[dflock](https://github.com/dflock) | <img width="50" src="https://avatars.githubusercontent.com/u/7990534?v=4"/></br>[drobilica](https://github.com/drobilica) | <img width="50" src="https://avatars.githubusercontent.com/u/21699905?v=4"/></br>[educbraga](https://github.com/educbraga) | <img width="50" src="https://avatars.githubusercontent.com/u/67867099?v=4"/></br>[eduardokimmel](https://github.com/eduardokimmel) | <img width="50" src="https://avatars.githubusercontent.com/u/30393516?v=4"/></br>[VodeniZeko](https://github.com/VodeniZeko) |
| <img width="50" src="https://avatars.githubusercontent.com/u/17415256?v=4"/></br>[ei-ke](https://github.com/ei-ke) | <img width="50" src="https://avatars.githubusercontent.com/u/1962738?v=4"/></br>[einverne](https://github.com/einverne) | <img width="50" src="https://avatars.githubusercontent.com/u/16492558?v=4"/></br>[eodeluga](https://github.com/eodeluga) | <img width="50" src="https://avatars.githubusercontent.com/u/16875937?v=4"/></br>[fathyar](https://github.com/fathyar) | <img width="50" src="https://avatars.githubusercontent.com/u/3057302?v=4"/></br>[fer22f](https://github.com/fer22f) |
| <img width="50" src="https://avatars.githubusercontent.com/u/43272148?v=4"/></br>[fpindado](https://github.com/fpindado) | <img width="50" src="https://avatars.githubusercontent.com/u/1714374?v=4"/></br>[FleischKarussel](https://github.com/FleischKarussel) | <img width="50" src="https://avatars.githubusercontent.com/u/18525376?v=4"/></br>[talkdirty](https://github.com/talkdirty) | <img width="50" src="https://avatars.githubusercontent.com/u/19814827?v=4"/></br>[gmaubach](https://github.com/gmaubach) | <img width="50" src="https://avatars.githubusercontent.com/u/6190183?v=4"/></br>[gmag11](https://github.com/gmag11) |
| <img width="50" src="https://avatars.githubusercontent.com/u/6209647?v=4"/></br>[Jackymancs4](https://github.com/Jackymancs4) | <img width="50" src="https://avatars.githubusercontent.com/u/297578?v=4"/></br>[Glandos](https://github.com/Glandos) | <img width="50" src="https://avatars.githubusercontent.com/u/24235344?v=4"/></br>[vibraniumdev](https://github.com/vibraniumdev) | <img width="50" src="https://avatars.githubusercontent.com/u/2257024?v=4"/></br>[gusbemacbe](https://github.com/gusbemacbe) | <img width="50" src="https://avatars.githubusercontent.com/u/64917442?v=4"/></br>[HOLLYwyh](https://github.com/HOLLYwyh) |
| <img width="50" src="https://avatars.githubusercontent.com/u/18524580?v=4"/></br>[Fvbor](https://github.com/Fvbor) | <img width="50" src="https://avatars.githubusercontent.com/u/22606250?v=4"/></br>[bennetthanna](https://github.com/bennetthanna) | <img width="50" src="https://avatars.githubusercontent.com/u/67231570?v=4"/></br>[harshitkathuria](https://github.com/harshitkathuria) | <img width="50" src="https://avatars.githubusercontent.com/u/1716229?v=4"/></br>[Vistaus](https://github.com/Vistaus) | <img width="50" src="https://avatars.githubusercontent.com/u/6509881?v=4"/></br>[ianjs](https://github.com/ianjs) |
| <img width="50" src="https://avatars.githubusercontent.com/u/19862172?v=4"/></br>[iahmedbacha](https://github.com/iahmedbacha) | <img width="50" src="https://avatars.githubusercontent.com/u/1533624?v=4"/></br>[IrvinDominin](https://github.com/IrvinDominin) | <img width="50" src="https://avatars.githubusercontent.com/u/33200024?v=4"/></br>[ishammahajan](https://github.com/ishammahajan) | <img width="50" src="https://avatars.githubusercontent.com/u/6916297?v=4"/></br>[ffadilaputra](https://github.com/ffadilaputra) | <img width="50" src="https://avatars.githubusercontent.com/u/19985741?v=4"/></br>[JRaiden16](https://github.com/JRaiden16) |
| <img width="50" src="https://avatars.githubusercontent.com/u/11466782?v=4"/></br>[jacobherrington](https://github.com/jacobherrington) | <img width="50" src="https://avatars.githubusercontent.com/u/9365179?v=4"/></br>[jamesadjinwa](https://github.com/jamesadjinwa) | <img width="50" src="https://avatars.githubusercontent.com/u/20801821?v=4"/></br>[jrwrigh](https://github.com/jrwrigh) | <img width="50" src="https://avatars.githubusercontent.com/u/4995433?v=4"/></br>[jaredcrowe](https://github.com/jaredcrowe) | <img width="50" src="https://avatars.githubusercontent.com/u/4087105?v=4"/></br>[volatilevar](https://github.com/volatilevar) |
| <img width="50" src="https://avatars.githubusercontent.com/u/47724360?v=4"/></br>[innkuika](https://github.com/innkuika) | <img width="50" src="https://avatars.githubusercontent.com/u/163555?v=4"/></br>[JoelRSimpson](https://github.com/JoelRSimpson) | <img width="50" src="https://avatars.githubusercontent.com/u/6965062?v=4"/></br>[joeltaylor](https://github.com/joeltaylor) | <img width="50" src="https://avatars.githubusercontent.com/u/242107?v=4"/></br>[exic](https://github.com/exic) | <img width="50" src="https://avatars.githubusercontent.com/u/13716151?v=4"/></br>[JonathanPlasse](https://github.com/JonathanPlasse) |
| <img width="50" src="https://avatars.githubusercontent.com/u/1248504?v=4"/></br>[joesfer](https://github.com/joesfer) | <img width="50" src="https://avatars.githubusercontent.com/u/6048003?v=4"/></br>[joybinchen](https://github.com/joybinchen) | <img width="50" src="https://avatars.githubusercontent.com/u/37601331?v=4"/></br>[kaustubhsh](https://github.com/kaustubhsh) | <img width="50" src="https://avatars.githubusercontent.com/u/1560189?v=4"/></br>[y-usuzumi](https://github.com/y-usuzumi) | <img width="50" src="https://avatars.githubusercontent.com/u/1660460?v=4"/></br>[xuhcc](https://github.com/xuhcc) |
| <img width="50" src="https://avatars.githubusercontent.com/u/16933735?v=4"/></br>[kirtanprht](https://github.com/kirtanprht) | <img width="50" src="https://avatars.githubusercontent.com/u/37491732?v=4"/></br>[k0ur0x](https://github.com/k0ur0x) | <img width="50" src="https://avatars.githubusercontent.com/u/7824233?v=4"/></br>[kklas](https://github.com/kklas) | <img width="50" src="https://avatars.githubusercontent.com/u/8622992?v=4"/></br>[xmlangel](https://github.com/xmlangel) | <img width="50" src="https://avatars.githubusercontent.com/u/1055100?v=4"/></br>[troilus](https://github.com/troilus) |
| <img width="50" src="https://avatars.githubusercontent.com/u/2599210?v=4"/></br>[lboullo0](https://github.com/lboullo0) | <img width="50" src="https://avatars.githubusercontent.com/u/1562062?v=4"/></br>[dbinary](https://github.com/dbinary) | <img width="50" src="https://avatars.githubusercontent.com/u/15436007?v=4"/></br>[marc-bouvier](https://github.com/marc-bouvier) | <img width="50" src="https://avatars.githubusercontent.com/u/5699725?v=4"/></br>[mvonmaltitz](https://github.com/mvonmaltitz) | <img width="50" src="https://avatars.githubusercontent.com/u/11036464?v=4"/></br>[mlkood](https://github.com/mlkood) |
| <img width="50" src="https://avatars.githubusercontent.com/u/2480960?v=4"/></br>[plextoriano](https://github.com/plextoriano) | <img width="50" src="https://avatars.githubusercontent.com/u/5788516?v=4"/></br>[Marmo](https://github.com/Marmo) | <img width="50" src="https://avatars.githubusercontent.com/u/29300939?v=4"/></br>[mcejp](https://github.com/mcejp) | <img width="50" src="https://avatars.githubusercontent.com/u/640949?v=4"/></br>[freaktechnik](https://github.com/freaktechnik) | <img width="50" src="https://avatars.githubusercontent.com/u/79802125?v=4"/></br>[martinkorelic](https://github.com/martinkorelic) |
| <img width="50" src="https://avatars.githubusercontent.com/u/287105?v=4"/></br>[Petemir](https://github.com/Petemir) | <img width="50" src="https://avatars.githubusercontent.com/u/5218859?v=4"/></br>[matsair](https://github.com/matsair) | <img width="50" src="https://avatars.githubusercontent.com/u/12831489?v=4"/></br>[mgroth0](https://github.com/mgroth0) | <img width="50" src="https://avatars.githubusercontent.com/u/21796?v=4"/></br>[silentmatt](https://github.com/silentmatt) | <img width="50" src="https://avatars.githubusercontent.com/u/76700192?v=4"/></br>[maxs-test](https://github.com/maxs-test) |
| <img width="50" src="https://avatars.githubusercontent.com/u/59669349?v=4"/></br>[MichBoi](https://github.com/MichBoi) | <img width="50" src="https://avatars.githubusercontent.com/u/51273874?v=4"/></br>[MichipX](https://github.com/MichipX) | <img width="50" src="https://avatars.githubusercontent.com/u/53177864?v=4"/></br>[MrTraduttore](https://github.com/MrTraduttore) | <img width="50" src="https://avatars.githubusercontent.com/u/48156230?v=4"/></br>[sanjarcode](https://github.com/sanjarcode) | <img width="50" src="https://avatars.githubusercontent.com/u/43955099?v=4"/></br>[Mustafa-ALD](https://github.com/Mustafa-ALD) |
| <img width="50" src="https://avatars.githubusercontent.com/u/9076687?v=4"/></br>[NJannasch](https://github.com/NJannasch) | <img width="50" src="https://avatars.githubusercontent.com/u/8016073?v=4"/></br>[zomglings](https://github.com/zomglings) | <img width="50" src="https://avatars.githubusercontent.com/u/10386884?v=4"/></br>[Frichetten](https://github.com/Frichetten) | <img width="50" src="https://avatars.githubusercontent.com/u/5541611?v=4"/></br>[nicolas-suzuki](https://github.com/nicolas-suzuki) | <img width="50" src="https://avatars.githubusercontent.com/u/12369770?v=4"/></br>[Ouvill](https://github.com/Ouvill) |
| <img width="50" src="https://avatars.githubusercontent.com/u/43815417?v=4"/></br>[shorty2380](https://github.com/shorty2380) | <img width="50" src="https://avatars.githubusercontent.com/u/15014287?v=4"/></br>[dist3r](https://github.com/dist3r) | <img width="50" src="https://avatars.githubusercontent.com/u/19418601?v=4"/></br>[rakleed](https://github.com/rakleed) | <img width="50" src="https://avatars.githubusercontent.com/u/7881932?v=4"/></br>[idle-code](https://github.com/idle-code) | <img width="50" src="https://avatars.githubusercontent.com/u/168931?v=4"/></br>[bobchao](https://github.com/bobchao) |
| <img width="50" src="https://avatars.githubusercontent.com/u/6306608?v=4"/></br>[Diadlo](https://github.com/Diadlo) | <img width="50" src="https://avatars.githubusercontent.com/u/42793024?v=4"/></br>[pranavmodx](https://github.com/pranavmodx) | <img width="50" src="https://avatars.githubusercontent.com/u/50834839?v=4"/></br>[R3dError](https://github.com/R3dError) | <img width="50" src="https://avatars.githubusercontent.com/u/42652941?v=4"/></br>[rajprakash00](https://github.com/rajprakash00) | <img width="50" src="https://avatars.githubusercontent.com/u/32304956?v=4"/></br>[rahil1304](https://github.com/rahil1304) |
| <img width="50" src="https://avatars.githubusercontent.com/u/8257474?v=4"/></br>[rasulkireev](https://github.com/rasulkireev) | <img width="50" src="https://avatars.githubusercontent.com/u/17312341?v=4"/></br>[reinhart1010](https://github.com/reinhart1010) | <img width="50" src="https://avatars.githubusercontent.com/u/60484714?v=4"/></br>[Retew](https://github.com/Retew) | <img width="50" src="https://avatars.githubusercontent.com/u/10456131?v=4"/></br>[ambrt](https://github.com/ambrt) | <img width="50" src="https://avatars.githubusercontent.com/u/15892014?v=4"/></br>[Derkades](https://github.com/Derkades) |
| <img width="50" src="https://avatars.githubusercontent.com/u/49439044?v=4"/></br>[fourstepper](https://github.com/fourstepper) | <img width="50" src="https://avatars.githubusercontent.com/u/54365?v=4"/></br>[rodgco](https://github.com/rodgco) | <img width="50" src="https://avatars.githubusercontent.com/u/96014?v=4"/></br>[Ronnie76er](https://github.com/Ronnie76er) | <img width="50" src="https://avatars.githubusercontent.com/u/79168?v=4"/></br>[roryokane](https://github.com/roryokane) | <img width="50" src="https://avatars.githubusercontent.com/u/744655?v=4"/></br>[ruzaq](https://github.com/ruzaq) |
| <img width="50" src="https://avatars.githubusercontent.com/u/20490839?v=4"/></br>[szokesandor](https://github.com/szokesandor) | <img width="50" src="https://avatars.githubusercontent.com/u/19328605?v=4"/></br>[SamuelBlickle](https://github.com/SamuelBlickle) | <img width="50" src="https://avatars.githubusercontent.com/u/80849457?v=4"/></br>[livingc0l0ur](https://github.com/livingc0l0ur) | <img width="50" src="https://avatars.githubusercontent.com/u/1776?v=4"/></br>[bronson](https://github.com/bronson) | <img width="50" src="https://avatars.githubusercontent.com/u/24606935?v=4"/></br>[semperor](https://github.com/semperor) |
| <img width="50" src="https://avatars.githubusercontent.com/u/607938?v=4"/></br>[shawnaxsom](https://github.com/shawnaxsom) | <img width="50" src="https://avatars.githubusercontent.com/u/9937486?v=4"/></br>[SFoskitt](https://github.com/SFoskitt) | <img width="50" src="https://avatars.githubusercontent.com/u/505011?v=4"/></br>[kcrt](https://github.com/kcrt) | <img width="50" src="https://avatars.githubusercontent.com/u/538584?v=4"/></br>[xissy](https://github.com/xissy) | <img width="50" src="https://avatars.githubusercontent.com/u/164962?v=4"/></br>[tams](https://github.com/tams) |
| <img width="50" src="https://avatars.githubusercontent.com/u/466122?v=4"/></br>[Tekki](https://github.com/Tekki) | <img width="50" src="https://avatars.githubusercontent.com/u/2112477?v=4"/></br>[ThatcherC](https://github.com/ThatcherC) | <img width="50" src="https://avatars.githubusercontent.com/u/21969426?v=4"/></br>[TheoDutch](https://github.com/TheoDutch) | <img width="50" src="https://avatars.githubusercontent.com/u/8731922?v=4"/></br>[tbroadley](https://github.com/tbroadley) | <img width="50" src="https://avatars.githubusercontent.com/u/114300?v=4"/></br>[Kriechi](https://github.com/Kriechi) |
| <img width="50" src="https://avatars.githubusercontent.com/u/3457339?v=4"/></br>[tkilaker](https://github.com/tkilaker) | <img width="50" src="https://avatars.githubusercontent.com/u/802148?v=4"/></br>[Tim-Erwin](https://github.com/Tim-Erwin) | <img width="50" src="https://avatars.githubusercontent.com/u/4201229?v=4"/></br>[tcyrus](https://github.com/tcyrus) | <img width="50" src="https://avatars.githubusercontent.com/u/834914?v=4"/></br>[tobias-grasse](https://github.com/tobias-grasse) | <img width="50" src="https://avatars.githubusercontent.com/u/6691273?v=4"/></br>[strobeltobias](https://github.com/strobeltobias) |
| <img width="50" src="https://avatars.githubusercontent.com/u/1677578?v=4"/></br>[kostegit](https://github.com/kostegit) | <img width="50" src="https://avatars.githubusercontent.com/u/70296?v=4"/></br>[tbergeron](https://github.com/tbergeron) | <img width="50" src="https://avatars.githubusercontent.com/u/10265443?v=4"/></br>[Ullas-Aithal](https://github.com/Ullas-Aithal) | <img width="50" src="https://avatars.githubusercontent.com/u/6104498?v=4"/></br>[MyTheValentinus](https://github.com/MyTheValentinus) | <img width="50" src="https://avatars.githubusercontent.com/u/2830093?v=4"/></br>[vassudanagunta](https://github.com/vassudanagunta) |
| <img width="50" src="https://avatars.githubusercontent.com/u/54314949?v=4"/></br>[vijayjoshi16](https://github.com/vijayjoshi16) | <img width="50" src="https://avatars.githubusercontent.com/u/59287619?v=4"/></br>[max-keviv](https://github.com/max-keviv) | <img width="50" src="https://avatars.githubusercontent.com/u/598576?v=4"/></br>[vandreykiv](https://github.com/vandreykiv) | <img width="50" src="https://avatars.githubusercontent.com/u/26511487?v=4"/></br>[WisdomCode](https://github.com/WisdomCode) | <img width="50" src="https://avatars.githubusercontent.com/u/1921957?v=4"/></br>[xsak](https://github.com/xsak) |
| <img width="50" src="https://avatars.githubusercontent.com/u/11031696?v=4"/></br>[ymitsos](https://github.com/ymitsos) | <img width="50" src="https://avatars.githubusercontent.com/u/63324960?v=4"/></br>[abolishallprivateproperty](https://github.com/abolishallprivateproperty) | <img width="50" src="https://avatars.githubusercontent.com/u/11336076?v=4"/></br>[aerotog](https://github.com/aerotog) | <img width="50" src="https://avatars.githubusercontent.com/u/39854348?v=4"/></br>[albertopasqualetto](https://github.com/albertopasqualetto) | <img width="50" src="https://avatars.githubusercontent.com/u/44570278?v=4"/></br>[asrient](https://github.com/asrient) |
| <img width="50" src="https://avatars.githubusercontent.com/u/621360?v=4"/></br>[bestlibre](https://github.com/bestlibre) | <img width="50" src="https://avatars.githubusercontent.com/u/35600612?v=4"/></br>[boring10](https://github.com/boring10) | <img width="50" src="https://avatars.githubusercontent.com/u/13894820?v=4"/></br>[cadolphs](https://github.com/cadolphs) | <img width="50" src="https://avatars.githubusercontent.com/u/12461043?v=4"/></br>[colorchestra](https://github.com/colorchestra) | <img width="50" src="https://avatars.githubusercontent.com/u/30935096?v=4"/></br>[cybertramp](https://github.com/cybertramp) |
| <img width="50" src="https://avatars.githubusercontent.com/u/15824892?v=4"/></br>[dartero](https://github.com/dartero) | <img width="50" src="https://avatars.githubusercontent.com/u/9694906?v=4"/></br>[delta-emil](https://github.com/delta-emil) | <img width="50" src="https://avatars.githubusercontent.com/u/926263?v=4"/></br>[doc75](https://github.com/doc75) | <img width="50" src="https://avatars.githubusercontent.com/u/5589253?v=4"/></br>[dsp77](https://github.com/dsp77) | <img width="50" src="https://avatars.githubusercontent.com/u/2903013?v=4"/></br>[ebayer](https://github.com/ebayer) |
| <img width="50" src="https://avatars.githubusercontent.com/u/9206310?v=4"/></br>[elsiehupp](https://github.com/elsiehupp) | <img width="50" src="https://avatars.githubusercontent.com/u/701050?v=4"/></br>[espinosa](https://github.com/espinosa) | <img width="50" src="https://avatars.githubusercontent.com/u/18619090?v=4"/></br>[exponentactivity](https://github.com/exponentactivity) | <img width="50" src="https://avatars.githubusercontent.com/u/16708935?v=4"/></br>[exprez135](https://github.com/exprez135) | <img width="50" src="https://avatars.githubusercontent.com/u/9768112?v=4"/></br>[fab4x](https://github.com/fab4x) |
| <img width="50" src="https://avatars.githubusercontent.com/u/47755037?v=4"/></br>[fabianski7](https://github.com/fabianski7) | <img width="50" src="https://avatars.githubusercontent.com/u/14201321?v=4"/></br>[rasperepodvipodvert](https://github.com/rasperepodvipodvert) | <img width="50" src="https://avatars.githubusercontent.com/u/748808?v=4"/></br>[gasolin](https://github.com/gasolin) | <img width="50" src="https://avatars.githubusercontent.com/u/47191051?v=4"/></br>[githubaccount073](https://github.com/githubaccount073) | <img width="50" src="https://avatars.githubusercontent.com/u/43672033?v=4"/></br>[hms5232](https://github.com/hms5232) |
| <img width="50" src="https://avatars.githubusercontent.com/u/11388094?v=4"/></br>[hydrandt](https://github.com/hydrandt) | <img width="50" src="https://avatars.githubusercontent.com/u/61012185?v=4"/></br>[iamtalwinder](https://github.com/iamtalwinder) | <img width="50" src="https://avatars.githubusercontent.com/u/557540?v=4"/></br>[jabdoa2](https://github.com/jabdoa2) | <img width="50" src="https://avatars.githubusercontent.com/u/29166402?v=4"/></br>[jduar](https://github.com/jduar) | <img width="50" src="https://avatars.githubusercontent.com/u/2678545?v=4"/></br>[jibedoubleve](https://github.com/jibedoubleve) |
| <img width="50" src="https://avatars.githubusercontent.com/u/53862536?v=4"/></br>[johanvanheusden](https://github.com/johanvanheusden) | <img width="50" src="https://avatars.githubusercontent.com/u/38327267?v=4"/></br>[jtagcat](https://github.com/jtagcat) | <img width="50" src="https://avatars.githubusercontent.com/u/61631665?v=4"/></br>[konhi](https://github.com/konhi) | <img width="50" src="https://avatars.githubusercontent.com/u/54991735?v=4"/></br>[krzysiekwie](https://github.com/krzysiekwie) | <img width="50" src="https://avatars.githubusercontent.com/u/12849008?v=4"/></br>[lighthousebulb](https://github.com/lighthousebulb) |
| <img width="50" src="https://avatars.githubusercontent.com/u/4140247?v=4"/></br>[luzpaz](https://github.com/luzpaz) | <img width="50" src="https://avatars.githubusercontent.com/u/29355048?v=4"/></br>[majsterkovic](https://github.com/majsterkovic) | <img width="50" src="https://avatars.githubusercontent.com/u/77744862?v=4"/></br>[mak2002](https://github.com/mak2002) | <img width="50" src="https://avatars.githubusercontent.com/u/30428258?v=4"/></br>[nmiquan](https://github.com/nmiquan) | <img width="50" src="https://avatars.githubusercontent.com/u/31123054?v=4"/></br>[nullpointer666](https://github.com/nullpointer666) |
| <img width="50" src="https://avatars.githubusercontent.com/u/2979926?v=4"/></br>[oscaretu](https://github.com/oscaretu) | <img width="50" src="https://avatars.githubusercontent.com/u/36965591?v=4"/></br>[oskarsh](https://github.com/oskarsh) | <img width="50" src="https://avatars.githubusercontent.com/u/52031346?v=4"/></br>[osso73](https://github.com/osso73) | <img width="50" src="https://avatars.githubusercontent.com/u/29743024?v=4"/></br>[over-soul](https://github.com/over-soul) | <img width="50" src="https://avatars.githubusercontent.com/u/42961947?v=4"/></br>[pensierocrea](https://github.com/pensierocrea) |
| <img width="50" src="https://avatars.githubusercontent.com/u/45542782?v=4"/></br>[pomeloy](https://github.com/pomeloy) | <img width="50" src="https://avatars.githubusercontent.com/u/10206967?v=4"/></br>[rhtenhove](https://github.com/rhtenhove) | <img width="50" src="https://avatars.githubusercontent.com/u/16728217?v=4"/></br>[rikanotank1](https://github.com/rikanotank1) | <img width="50" src="https://avatars.githubusercontent.com/u/24560368?v=4"/></br>[rxliuli](https://github.com/rxliuli) | <img width="50" src="https://avatars.githubusercontent.com/u/14062932?v=4"/></br>[simonsan](https://github.com/simonsan) |
| <img width="50" src="https://avatars.githubusercontent.com/u/5004545?v=4"/></br>[stellarpower](https://github.com/stellarpower) | <img width="50" src="https://avatars.githubusercontent.com/u/20983267?v=4"/></br>[suixinio](https://github.com/suixinio) | <img width="50" src="https://avatars.githubusercontent.com/u/12995773?v=4"/></br>[sumomo-99](https://github.com/sumomo-99) | <img width="50" src="https://avatars.githubusercontent.com/u/367170?v=4"/></br>[xtatsux](https://github.com/xtatsux) | <img width="50" src="https://avatars.githubusercontent.com/u/6908872?v=4"/></br>[taw00](https://github.com/taw00) |
| <img width="50" src="https://avatars.githubusercontent.com/u/10956653?v=4"/></br>[tcassaert](https://github.com/tcassaert) | <img width="50" src="https://avatars.githubusercontent.com/u/46327531?v=4"/></br>[victante](https://github.com/victante) | <img width="50" src="https://avatars.githubusercontent.com/u/7252567?v=4"/></br>[Voltinus](https://github.com/Voltinus) | <img width="50" src="https://avatars.githubusercontent.com/u/2216902?v=4"/></br>[xcffl](https://github.com/xcffl) | <img width="50" src="https://avatars.githubusercontent.com/u/46404814?v=4"/></br>[yourcontact](https://github.com/yourcontact) |
| <img width="50" src="https://avatars.githubusercontent.com/u/37692927?v=4"/></br>[zaoyifan](https://github.com/zaoyifan) | <img width="50" src="https://avatars.githubusercontent.com/u/10813608?v=4"/></br>[zawnk](https://github.com/zawnk) | <img width="50" src="https://avatars.githubusercontent.com/u/55245068?v=4"/></br>[zen-quo](https://github.com/zen-quo) | <img width="50" src="https://avatars.githubusercontent.com/u/23507174?v=4"/></br>[zozolina123](https://github.com/zozolina123) | <img width="50" src="https://avatars.githubusercontent.com/u/25315?v=4"/></br>[xcession](https://github.com/xcession) |
| <img width="50" src="https://avatars.githubusercontent.com/u/34542665?v=4"/></br>[paventyang](https://github.com/paventyang) | <img width="50" src="https://avatars.githubusercontent.com/u/608014?v=4"/></br>[jackytsu](https://github.com/jackytsu) | <img width="50" src="https://avatars.githubusercontent.com/u/1308646?v=4"/></br>[zhangmx](https://github.com/zhangmx) |  |  |
<!-- CONTRIBUTORS-TABLE-AUTO-GENERATED -->
