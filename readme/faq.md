# When I open a note in vim, the cursor is not visible

It seems to be due to the setting `set term=ansi` in .vimrc. Removing it should fix the issue. See https://github.com/laurent22/joplin/issues/147 for more information.

# Is it possible to use real file and folder names in the sync target?

Unfortunately it is not possible. Joplin synchronises with file systems using an open format however it does not mean the sync files are meant to be user-editable. The format is designed to be performant and reliable, not user friendly (it cannot be both), and that cannot be changed. Joplin sync directory is basically just a database.

# Could there be a PIN or password to restrict access to Joplin?

Short answer: no. The end to end encryption that Joplin implements is to protect the data during transmission and on the cloud service so that only you can access it.

On the local device it is assumed that the data is safe due to the OS built-in security features. If additional security is needed it's always possible to put the notes on an encrypted Truecrypt drive for instance.

If someone that you don't trust has access to the computer, they can put a keylogger anyway so any local encryption or PIN access would not be useful.

# Why is it named Joplin?

The name comes from the composer and pianist [Scott Joplin](https://en.wikipedia.org/wiki/Scott_Joplin), which I often listen to. His name is also easy to remember and type so it fell like a good choice. And, to quote a user on Hacker News, "though Scott Joplin's ragtime musical style has a lot in common with some very informal music, his own approach was more educated, sophisticated, and precise. Every note was in its place for a reason, and he was known to prefer his pieces to be performed exactly as written. So you could say that compared to the people who came before him, his notes were more organized".
