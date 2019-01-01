# Clicking 'Edit in External Editor' does nothing! / I want to change the editor!

The editor command (may include arguments) defines which editor will be used to open a note. If none is provided it will try to auto-detect the default editor. If this does nothing or you want to change it for Joplin, you need to configure it in Settings -> Text editor command.

Some example configurations are: (comments after #)

Linux/Mac:

```bash
subl -n       # Opens Sublime (subl) in a new window (-n)
code -n       # Opens Visual Studio Code (code) in a new window (-n)
gedit --new-window    # Opens gedit (Gnome Text Editor) in a new window
xterm -e vim  # Opens a new terminal and opens vim. Can be replaced with an
              # alternative terminal (gnome-terminal, terminator, etc.) 
              # or terminal text-editor (emacs, nano, etc.)
open -a <application> # Mac only: opens a GUI application
```

Windows:

```bash
subl.exe -n   # Opens Sublime (subl) in a new window (-n)
code.exe -n   # Opens Visual Studio Code in a new window (-n)
notepad.exe   # Opens Notepad in a new window
notepad++.exe --openSession   # Opens Notepad ++ in new window
```

Note that the path to directory with your editor executable must exist in your PATH variable ([Windows](https://www.computerhope.com/issues/ch000549.htm), [Linux/Mac](https://opensource.com/article/17/6/set-path-linux)) If not, the full path to the executable must be provided.

# When I open a note in vim, the cursor is not visible

It seems to be due to the setting `set term=ansi` in .vimrc. Removing it should fix the issue. See https://github.com/laurent22/joplin/issues/147 for more information.

# All my notes got deleted after changing the WebDAV URL!

When changing the WebDAV URL, make sure that the new location has the same exact content as the old location (i.e. copy all the Joplin data over to the new location). Otherwise, if there's nothing on the new location, Joplin is going to think that you have deleted all your data and will proceed to delete it locally too. So to change the WebDAV URL, please follow these steps:

1. Make a backup of your Joplin data in case something goes wrong. Export to a JEX archive for example.
2. Synchronise one last time all your data from a Joplin client (for example, from the desktop client)
3. Close the Joplin client.
4. On your WebDAV service, copy all the Joplin files from the old location to the new one. Make sure to also copy the `.resource` directory as it contains your images and other attachments.
5. Once it's done, open Joplin again and change the WebDAV URL.
6. Synchronise to verify that everything is working.
7. Do step 5 and 6 for all the other Joplin clients you need to sync.

# How can I easily enter Markdown tags in Android?

You may use a special keyboard such as [Multiling O Keyboard](https://play.google.com/store/apps/details?id=kl.ime.oh&hl=en), which has shortcuts to create Markdown tags. [More information in this post](https://discourse.joplin.cozic.net/t/android-create-new-list-item-with-enter/585/2?u=laurent).

# The initial sync is very slow, how can I speed it up?

Whenever importing a large number of notes, for example from Evernote, it may take a very long time for the first sync to complete. There are various techniques to speed thing up (if you don't want to simply wait for the sync to complete), which are outlined in [this post](https://discourse.joplin.cozic.net/t/workaround-for-slow-initial-bulk-sync-after-evernote-import/746?u=laurent).

# Is it possible to use real file and folder names in the sync target?

Unfortunately it is not possible. Joplin synchronises with file systems using an open format however it does not mean the sync files are meant to be user-editable. The format is designed to be performant and reliable, not user friendly (it cannot be both), and that cannot be changed. Joplin sync directory is basically just a database.

# Could there be a PIN or password to restrict access to Joplin?

Short answer: no. The end to end encryption that Joplin implements is to protect the data during transmission and on the cloud service so that only you can access it.

On the local device it is assumed that the data is safe due to the OS built-in security features. If additional security is needed it's always possible to put the notes on an encrypted Truecrypt drive for instance.

If someone that you don't trust has access to the computer, they can put a keylogger anyway so any local encryption or PIN access would not be useful.

# WebDAV synchronisation is not working

## "Forbidden" error in Strato

For example:

    MKCOL .sync/: Unknown error 2 (403): <!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">
    <html><head>
    <title>403 Forbidden</title>
    </head><body>
    <h1>Forbidden</h1>
    <p>You don't have permission to access /.sync/
    on this server.</p>
    </body></html>

In this case, [make sure you enter the correct WebDAV URL](https://github.com/laurent22/joplin/issues/309).

## Nextcloud sync is not working

- Check your username and password. **Type it manually** (without copying and pasting it) and try again.
- Check the WebDAV URL - to get the correct URL, go to Nextcloud and, in the left sidebar, click on "Settings" and copy the WebDAV URL from there. **Do not forget to add the folder you've created to that URL**. For example, if the base the WebDAV URL is "https://example.com/nextcloud/remote.php/webdav/" and you want the notes to be synced in the "Joplin" directory, you need to give the URL "https://example.com/nextcloud/remote.php/webdav/Joplin" **and you need to create the "Joplin" directory yourself**.

# Could you publish Joplin on F-droid?

Joplin relies on Firebase to enable reliable notifications on Android. Since F-Droid [do not accept applications that depend on this package](https://gitlab.com/fdroid/rfp/issues/434#note_55239154), it is not currently possible to have Joplin in that repository. To avoid using Google Play, you have the option to directly download the Joplin APK file.

# Why is it named Joplin?

The name comes from the composer and pianist [Scott Joplin](https://en.wikipedia.org/wiki/Scott_Joplin), which I often listen to. His name is also easy to remember and type so it fell like a good choice. And, to quote a user on Hacker News, "though Scott Joplin's ragtime musical style has a lot in common with some very informal music, his own approach was more educated, sophisticated, and precise. Every note was in its place for a reason, and he was known to prefer his pieces to be performed exactly as written. So you could say that compared to the people who came before him, his notes were more organized".
