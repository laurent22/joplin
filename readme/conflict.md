# What is a conflict?

A conflict happens when one note or one attachment is modified in two different places, and then synchronised. In that case, it not possible to determine which version of the note or attachment you want to keep, and thus a conflict is generated.

# What happens in case of a conflict?

When Joplin detects a conflict, the local note is copied to the Conflict notebook so as to avoid any data loss. Then the remote note is downloaded. You can then inspect the notes in the Conflict notebook, compare it with your other version, and copy any change that might have been overwritten.

# How to avoid conflicts?

Conflicts are always annoying to deal with so it is best to avoid them as much as possible.

For this, the best way is to synchronise as often as possible, so that you are always working with the latest versions of your notes.

Joplin attempts to do this by uploading your latest changes within a few seconds. However, downloading changes is done at fixed intervals, every few minutes (as defined in the Config screen) and this is where conflicts may happen. It can also happen if one of your device did not have an internet connection for some times, and then synchronises. A bad internet connection can also hinder synchronisation because it will interrupt the process, which may have to restarted from the beginning to ensure consistency.

So if you have not opened your application in a while, manually sync it and wait for it to complete, that way you are sure that whatever change you make will be on the latest version of the note.
