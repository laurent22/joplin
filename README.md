This is a modified version of Joplin based on 2.13.2. Among the main features added is having all notebooks and notes automatically saved as folders and markdown files onto the local file system, and the files and folders are maintained up-to-date with the database of Joplin.

#### Disktop application

On the desktop application, the default directory where the notebooks and notes are saved to are under "JoplinFiles" under "Documents" of the user's home directory, in Linux notion: "/home/yourname/Documents/JoplinFiles/" (it can not be customized now). Under there, there are sub-directories based on Joplin's profile ID. If the user hasn't added additional profiles when using Joplin, all the notebooks and notes are saved under the "default" directory. Notebooks are organized as directory trees and note files are under the associated notebook folders. (Note, if you are running a dev version from source, the directory would be "/home/yourname/Documents/JoplinDevFiles/").

#### Android app

The default directory on Android is different. On Android 9 or older, the directory where "JoplinFiles" resides is "Android/data/net.cozic.joplinx/files". On Android 10 or newer, the directory is chosen by the user upon first start of the app. These directories can not be changed at the moment. (With dev version, on Android 9 or older, the directory is "Android/data/net.cozic.joplinx.D/files").

Upon the start of Joplin when the said directories don't exist, Joplin will create them and populate them with sub-directories and files. Directories are named with the titles of the notebooks. Files are named with the titles of the notes, as: "the note title.md". If the note is a to-do note, it is named as "X - note title.md" (if the to-do is not completed), or "V - note title.md" (if the to-do has been completed).

Any special character among `?:\"*|/\\<>` in the title are removed.

You can create, update, move, delete notes or notebooks in Joplin and the files and directories are promptly updated.

One efficiency improvement is on the frequency of saving notes during editing. Originally, Joplin saves the note to DB on every key stroke, which appears quite inefficient. Now, note is saved every 60 seconds, or upon leaving the note editor.

Rich text editor is currently not supported.

The Linux application appears to work well. And an AppImage file is included in the release. I don't have versions for Mac or Windows and welcome anyone willing to build and test them.

Android app appears to work accordingly. A release version is uploaded. For easy testing and not affecting you existing Joplin, the app in the apk is named "JoplinX".

Currently, modifications of directories or files outside of Joplin are not updated back into Joplin, but this is being worked on.

<img width="64" src="https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/LinuxIcons/256x256.png" align="left" style="margin-right:15px"/>

**Joplin** is a free, open source note taking and to-do application, which can handle a large number of notes organised into notebooks. The notes are searchable, can be copied, tagged and modified either from the applications directly or from your own text editor. The notes are in [Markdown format](https://github.com/laurent22/joplin/blob/dev/readme/apps/markdown.md).

Notes exported from Evernote [can be imported](https://github.com/laurent22/joplin/blob/dev/readme/apps/import_export.md) into Joplin, including the formatted content (which is converted to Markdown), resources (images, attachments, etc.) and complete metadata (geolocation, updated time, created time, etc.). Plain Markdown files can also be imported.

Joplin is "offline first", which means you always have all your data on your phone or computer. This ensures that your notes are always accessible, whether you have an internet connection or not.

The notes can be securely [synchronised](https://github.com/laurent22/joplin/blob/dev/readme/apps/sync/index.md) using [end-to-end encryption](https://github.com/laurent22/joplin/blob/dev/readme/apps/sync/e2ee.md) with various cloud services including Nextcloud, Dropbox, OneDrive and [Joplin Cloud](https://joplinapp.org/plans/).

Full text search is available on all platforms to quickly find the information you need. The app can be customised using plugins and themes, and you can also easily create your own.

The application is available for Windows, Linux, macOS, Android and iOS. A [Web Clipper](https://github.com/laurent22/joplin/blob/dev/readme/apps/clipper.md), to save web pages and screenshots from your browser, is also available for [Firefox](https://addons.mozilla.org/firefox/addon/joplin-web-clipper/) and [Chrome](https://chrome.google.com/webstore/detail/joplin-web-clipper/alofnhikmmkdbbbgpnglcpdollgjjfek?hl=en-GB).

<div class="top-screenshot"><img src="https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/home-top-img.png" style="max-width: 100%; max-height: 35em;"></div>

For more about Joplin, refer to [full Joplin documentation](https://joplinapp.org)
