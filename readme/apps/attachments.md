# Attachments

Any kind of file can be attached to a note. In Markdown, links to these files are represented as a simple ID to the attachment, clicking on this link will open the file in the default application. In the case of audio, video and pdf files, these will be displayed inline with the note and so can be viewed or played within Joplin.

In the **desktop application**, files can be attached either by clicking the "Attach file" icon in the editor or via drag and drop. If you prefer to create a link to a local file instead, hold the ALT key while performing the drag and drop operation. You can also copy and paste images directly in the editor via Ctrl+V.

Resources that are not attached to any note will be automatically deleted in accordance to the [Note History](https://github.com/laurent22/joplin/blob/dev/readme/apps/note_history.md) settings.

**Important:** Resources larger than 10 MB are not currently supported on mobile. They will crash the application when synchronising so it is recommended not to attach such resources at the moment. The issue is being looked at.

## Downloading attachments

The way the attachments are downloaded during synchronisation can be customised in the [Configuration screen](https://github.com/laurent22/joplin/blob/dev/readme/apps/config_screen.md), under "Attachment download behaviour". The default option ("Always") is to download all the attachments, all the time, so that the data is available even when the device is offline. There is also the option to download the attachments manually (option "Manual"), by clicking on it, or automatically (Option "Auto"), in which case the attachments are downloaded only when a note is opened. These options should help saving disk space and network bandwidth, especially on mobile.