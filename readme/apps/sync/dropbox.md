# Dropbox synchronisation

When syncing with Dropbox, Joplin creates a sub-directory in Dropbox, in `/Apps/Joplin` and reads/writes the notes and notebooks in it. The application does not have access to anything outside this directory.

In the **desktop application** or **mobile application**, select "Dropbox" as the synchronisation target in the [Configuration screen](https://github.com/laurent22/joplin/blob/dev/readme/apps/config_screen.md) (it is selected by default). Then, to initiate the synchronisation process, click on the "Synchronise" button in the sidebar and follow the instructions.

In the **terminal application**, set the `sync.target` config variable with `:config sync.target N`, where "N" is the corresponding number. To get a list of each number and its corresponding application, type `:config sync.target`. After setting the sync target, initiate the synchronisation process by typing `:sync`. You will be asked to follow a link to authorise the application.
