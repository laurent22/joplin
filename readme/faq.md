# When I open a note in vim, the cursor is not visible

It seems to be due to the setting `set term=ansi` in .vimrc. Removing it should fix the issue. See https://github.com/laurent22/joplin/issues/147 for more information.

# All my notes got deleted after changing the WebDAV URL!

When changing the WebDAV URL, make sure that the new location has the same exact content as the old location (i.e. copy all the Joplin data over to the new location). Otherwise, if there's nothing on the new location, Joplin is going to think that you have deleted all your data and will proceed to delete it locally too. So to change the WebDAV URL, please follow these steps:

0. Make a backup of your Joplin data in case something goes wrong. Export to a JEX archive for example.
1. Synchronise one last time all your data from a Joplin client (for example, from the desktop client)
2. Close the Joplin client.
3. On your WebDAV service, copy all the Joplin files from the old location to the new one. Make sure to also copy the `.resource` directory as it contains your images and other attachments.
4. Once it's done, open Joplin again and change the WebDAV URL.
5. Synchronise to verify that everything is working.
6. Do step 4 and 5 for all the other Joplin clients you need to sync.

# Is it possible to use real file and folder names in the sync target?

Unfortunately it is not possible. Joplin synchronises with file systems using an open format however it does not mean the sync files are meant to be user-editable. The format is designed to be performant and reliable, not user friendly (it cannot be both), and that cannot be changed. Joplin sync directory is basically just a database.

# Could there be a PIN or password to restrict access to Joplin?

Short answer: no. The end to end encryption that Joplin implements is to protect the data during transmission and on the cloud service so that only you can access it.

On the local device it is assumed that the data is safe due to the OS built-in security features. If additional security is needed it's always possible to put the notes on an encrypted Truecrypt drive for instance.

If someone that you don't trust has access to the computer, they can put a keylogger anyway so any local encryption or PIN access would not be useful.

# Why is it named Joplin?

The name comes from the composer and pianist [Scott Joplin](https://en.wikipedia.org/wiki/Scott_Joplin), which I often listen to. His name is also easy to remember and type so it fell like a good choice. And, to quote a user on Hacker News, "though Scott Joplin's ragtime musical style has a lot in common with some very informal music, his own approach was more educated, sophisticated, and precise. Every note was in its place for a reason, and he was known to prefer his pieces to be performed exactly as written. So you could say that compared to the people who came before him, his notes were more organized".
