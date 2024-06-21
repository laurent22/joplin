# OneDrive synchronisation

When syncing with OneDrive, Joplin creates a sub-directory in OneDrive, in /Apps/Joplin and reads/writes the notes and notebooks in it. The application does not have access to anything outside this directory.

In the **desktop application** or **mobile application**, select "OneDrive" as the synchronisation target in the [Configuration screen](https://github.com/laurent22/joplin/blob/dev/readme/apps/config_screen.md). Then, to initiate the synchronisation process, click on the "Synchronise" button in the sidebar and follow the instructions.

In the **terminal application**, to initiate the synchronisation process, type `:sync`. You will be asked to follow a link to authorise the application (simply input your Microsoft credentials - you do not need to register with OneDrive).