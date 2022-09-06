# External URL links

This feature allows creation of links to notes, folder, and tags. When opening such link Joplin will start, unless it's already running, and open the corresponding item.

To create a link, right click a note, a folder, or a tag in the sidebar and select "Copy external link". The link will be copied to clipboard.

## Link format

* `joplin://x-callback-url/openNote?id=<note id>` for note
* `joplin://x-callback-url/openFolder?id=<folder id>` for folder
* `joplin://x-callback-url/openTag?id=<tag id>` for tag

## Known problems

On macOS if Joplin isn't running it will start but it won't open the note. If Joplin is running but on a different space as the external link, then Joplin will come to the foreground but without displaying the note.
