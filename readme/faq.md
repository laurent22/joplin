# FAQ

## Installer gets stuck on Windows

The installer may get stuck if the app was not uninstalled correctly. To fix the issue you will need to clean up the left-over entry from the Registry. To do so please follow these steps:

- Press Win + R (Windows Key + R)
- Type "regedit.exe"
- Navigate to `HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Uninstall`
- In there, you will see one or more folders. Open them one by one to find the one for Joplin. One of the entries in there should be "DisplayName" with value "Joplin x.x.x".
- Once found, delete that folder.

Now try to install again and it should work.

More info there: https://github.com/electron-userland/electron-builder/issues/4057

## How can I pass arguments to the Linux installation script?

You can pass [arguments](https://github.com/laurent22/joplin/blob/dev/Joplin_install_and_update.sh#L37) to the installation script by using this command.

<pre><code style="word-break: break-all">wget -O - https://raw.githubusercontent.com/laurent22/joplin/dev/Joplin_install_and_update.sh | bash -s -- --argument1 --argument2</code></pre>

## Desktop application will not launch on Linux

If you downloaded the AppImage directly and therefore did not install via the recommended script then it may not be currently allowed to execute and needs to have these permissions set manually (see [AppImage User Guide](https://docs.appimage.org/introduction/quickstart.html#how-to-run-an-AppImage)).

If execution permissions are correct and it still does not launch then your system may not have the `libfuse2` library that AppImages require to run. This library requirement is inherent to the AppImage format and not Joplin specifically. For more info see [this forum thread](https://discourse.joplinapp.org/t/appimage-incompatibility-in-ubuntu-22-04/25173) which has further detail on the issue and an [Ubuntu specific fix](https://discourse.joplinapp.org/t/appimage-incompatibility-in-ubuntu-22-04/25173/12).

## How can I edit my note in an external text editor?

The editor command (may include arguments) defines which editor will be used to open a note. If none is provided it will try to auto-detect the default editor. If this does nothing or you want to change it for Joplin, you need to configure it in the Preferences -> Text editor command.

Some example configurations are: (comments after #)

Linux/Mac:

```bash
subl -n -w      # Opens Sublime (subl) in a new window (-n) and waits for close (-w)
code -n --wait  # Opens Visual Studio Code (code) in a new window (-n) and waits for close (--wait)
gedit --new-window    # Opens gedit (Gnome Text Editor) in a new window
xterm -e vim    # Opens a new terminal and opens vim. Can be replaced with an
                # alternative terminal (gnome-terminal, terminator, etc.)
                # or terminal text-editor (emacs, nano, etc.)
open -a <application> # Mac only: opens a GUI application
```

Windows:

```bash
subl.exe -n -w      # Opens Sublime (subl) in a new window (-n) and waits for close (-w)
code.exe -n --wait  # Opens Visual Studio Code in a new window (-n) and waits for close (--wait)
notepad.exe         # Opens Notepad in a new window
notepad++.exe --openSession   # Opens Notepad ++ in new window
```

Note that the path to directory with your editor executable must exist in your PATH variable ([Windows](https://www.computerhope.com/issues/ch000549.htm), [Linux/Mac](https://opensource.com/article/17/6/set-path-linux)) If not, the full path to the executable must be provided.

## When I open a note in vim, the cursor is not visible

It seems to be due to the setting `set term=ansi` in .vimrc. Removing it should fix the issue. See https://github.com/laurent22/joplin/issues/147 for more information.

## All my notes got deleted after changing the WebDAV URL!

When changing the WebDAV URL, make sure that the new location has the same exact content as the old location (i.e. copy all the Joplin data over to the new location). Otherwise, if there's nothing on the new location, Joplin is going to think that you have deleted all your data and will proceed to delete it locally too. So to change the WebDAV URL, please follow these steps:

1. Make a backup of your Joplin data in case something goes wrong. Export to a JEX archive for example.
2. Synchronise one last time all your data from a Joplin client (for example, from the desktop client)
3. Close the Joplin client.
4. On your WebDAV service, copy all the Joplin files from the old location to the new one. Make sure to also copy the `.resource` directory as it contains your images and other attachments.
5. Once it's done, open Joplin again and change the WebDAV URL.
6. Synchronise to verify that everything is working.
7. Do step 5 and 6 for all the other Joplin clients you need to sync.

## I deleted some notes by accident and don't have a backup

If you know the `NOTE_ID` and have note history enabled you can run the command `restoreNoteRevision` from the command palette e.g. `restoreNoteRevision 66457326a6ba4adeb4be8ce05e37af0d`. Joplin will then confirm if the restore was successful and place the note in a "Restored Note" notebook.
If you do not know the `NOTE_ID` then you can find this within the Joplin sqlite database as the `item_id` within the `deleted_items` or `revisions` tables. It will require some manual checking of the `title_diff` and `body_diff` fields to check if the `ITEM/NOTE_ID` you are targeting is the correct one.
You should first take a copy of the database to avoid making any accidental changes in the live one.
For further information go [here](https://discourse.joplinapp.org/t/restoring-deleted-notes/21304).

## How can I easily enter Markdown tags in Android?

You may use a special keyboard such as [Multiling O Keyboard](https://play.google.com/store/apps/details?id=kl.ime.oh&hl=en), which has shortcuts to create Markdown tags. [More information in this post](https://discourse.joplinapp.org/t/android-create-new-list-item-with-enter/585/2?u=laurent).

## The initial sync is very slow, how can I speed it up?

Whenever importing a large number of notes, for example from Evernote, it may take a very long time for the first sync to complete. There are various techniques to speed this up (if you don't want to simply wait for the sync to complete), which are outlined in [this post](https://discourse.joplinapp.org/t/workaround-for-slow-initial-bulk-sync-after-evernote-import/746?u=laurent).

## Not all notes, folders, or tags are displayed on the mobile app

Joplin does not have a background sync on mobile devices. When Joplin is closed, sent to the background or the device is put into sleep (display off), the sync is interrupted.

## How can I check the sync status?

Go to the synchronisation page. You can find it on the desktop application under `Help > Synchronisation Status` and on the mobile app under `Configuration > Tools > SYNC STATUS`.

`total items` = How many items there are in total to sync.  
`synced items` = How many items have already been uploaded or downloaded.

If `total items` and `synced items` are equal, all data has been synced. Also all devices should have the same `total items`.

## Is it possible to use real file and folder names in the sync target?

Unfortunately it is not possible. Joplin synchronises with file systems using an open format however it does not mean the sync files are meant to be user-editable. The format is designed to be performant and reliable, not user friendly (it cannot be both), and that cannot be changed. Joplin sync directory is basically just a database.

## Could there be a password to restrict access to Joplin?

On mobile, you may enable the biometric lock to protect the access to the Joplin application. On desktop we do not currently support this. There is however an issue open about it: https://github.com/laurent22/joplin/issues/289

## Why is my WebDAV host not working?

### "Forbidden" error in Strato

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

### The following WebDAV hosts are not supported

- Jianguoyun (see [Github issue](https://github.com/laurent22/joplin/issues/4294))
- pCloud (see [Forum thread](https://discourse.joplinapp.org/t/feature-request-pcloud-synchronisation/3530/51))

### Nextcloud sync is not working

- Check your username and password. **Type it manually** (without copying and pasting it) and try again.
- Check the WebDAV URL - to get the correct URL, go to Nextcloud and, in the left sidebar, click on "Settings" and copy the WebDAV URL from there. **Do not forget to add the folder you've created to that URL**. For example, if the base the WebDAV URL is "https://example.com/nextcloud/remote.php/webdav/" and you want the notes to be synced in the "Joplin" directory, you need to give the URL "https://example.com/nextcloud/remote.php/webdav/Joplin" **and you need to create the "Joplin" directory yourself**.
- Did you enable **2FA** (Multi-factor authentication) on Nextcloud? In that case, you need to [create an app password for Joplin in the Nextcloud admin interface](https://github.com/laurent22/joplin/issues/1453#issuecomment-486640902).

## Why did my sync and encryption passwords disappear after updating Joplin?

- With version 2.12, Joplin supports M1 Macs natively! As a result, upgrading Joplin on one of these systems causes Joplin to lose access to information stored by older versions of the app in the system keychain. This includes sync and encryption passwords.
- Re-entering the passwords should fix related sync and encryption issues.

## How can I use self-signed SSL certificates on Android?

If you want to serve using https but can't or don't want to use SSL certificates signed by trusted certificate authorities (like "Let's Encrypt"), it's possible to generate a custom CA and sign your certificates with it. You can generate the CA and certificates using [openssl](https://gist.github.com/fntlnz/cf14feb5a46b2eda428e000157447309), but I like to use a tool called [mkcert](https://github.com/FiloSottile/mkcert) for it's simplicity. Finally, you have to add your CA certificate to Android settings so that Android can recognize the certificates you signed with your CA as valid ([link](https://support.google.com/nexus/answer/2844832?hl=en-GB)).

## How do I restart Joplin on Windows (so that certain changes take effect)?

If `Show tray icon` is enabled, closing the Joplin window does not quit the application. To restart the application properly, one of the following has to be done to quit Joplin:

- click `File` in the menu and then click `Quit`
- right-click on the Joplin tray icon and then click `Exit`

Additionally the Windows Task Manager can be used to verify whether Joplin is still around.

## Are notebooks and notes backed up during an iOS backup to your Mac?

Notebooks and notes on iOS are not backed up when [backing up to your Mac](https://support.apple.com/guide/mac-help/back-up-and-restore-your-device-mchla3c8ed03/mac).

## Why is it named Joplin?

The application is named in honour of composer and pianist [Scott Joplin](https://en.wikipedia.org/wiki/Scott_Joplin), whose music I frequently listen to. His name is also easy to remember and type, making it a fitting choice.
