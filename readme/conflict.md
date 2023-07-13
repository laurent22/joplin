# What is a conflict?

A conflict happens when one note or one attachment is modified in two different places, and then synchronized. In that case, it is not possible to determine which version of the note or attachment you want to keep, and thus a conflict is generated.

# How to resolve a conflict?

When Joplin detects a conflict, it creates a _Conflict_ notebook and copies the local note to it.  Then the remote note replaces the local note. You can then inspect the notes in the Conflict notebook, compare it with your other version, and copy any change that might have been overwritten.

If you are sure that the local version on one of your devices was good, you can restore the 'pre-sync' version on that device: Select the note, click on (i) Note Properties, select _Previous versions of this note_, choose the good version, click _Restore_.

## If you do not remember your changes since the last failed synchronization
1. Use a merge tool, for example www.diffchecker.com
2. Copy the entire content of your _Conflict_/note
3. Paste it to the left side of your merge tool
4. Copy the entire content of your local note
5. Paste it to the right side of your merge tool
6. Decide which of the two versions is better (closer to complete)
7. Merge all the missing changes from the other version to the better version
8. Copy the better version and paste it into the Joplin local note
9. Synchronize
10. Delete the Conflict/note (right-click, Delete)

# How to avoid conflicts?

Conflicts are always annoying to deal with so it is best to avoid them as much as possible.

For this, the best way is to always synchronize before you start editing, and after you have finished editing. Make sure that synchronization completes.

Joplin attempts to do this by uploading your latest changes within a few seconds. However, downloading changes is done at fixed intervals, every few minutes (as defined in the Config screen) and this is where conflicts may happen. It can also happen if one of your device did not have an internet connection for some times, and then synchronises. A bad internet connection can also hinder synchronisation because it will interrupt the process, which may have to be restarted from the beginning to ensure consistency.

So if you have not opened your application in a while, manually sync it and wait for it to complete, that way you are sure that whatever change you make will be on the latest version of the note.
