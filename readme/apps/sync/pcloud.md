# pCloud synchronisation

When syncing with pCloud, Joplin creates a sub-directory at the root of your pCloud drive, in `/Joplin`, and reads/writes the notes and notebooks in it.

In the **desktop application** or **mobile application**, select "pCloud" as the synchronisation target in the [Configuration screen](https://github.com/laurent22/joplin/blob/dev/readme/apps/config_screen.md). Then, to initiate the synchronisation process, click on the "Synchronise" button in the sidebar and follow the instructions. You will be asked to open a link to authorise the application, then to copy the authorisation code provided by pCloud back into the application.

In the **terminal application**, to initiate the synchronisation process, type `:sync`. You will be asked to follow a link to authorise the application.

## Custom application credentials

The official Joplin applications include built-in pCloud application credentials. If you build the applications yourself, however, you will need to create your own pCloud application: open the [pCloud app console](https://docs.pcloud.com/oauth/index.html) ("My Apps") and create a new application to get a client ID and client secret. Note that pCloud currently approves new applications manually - if the option to create an application is not available, contact pCloud support. Then insert these credentials in `packages/lib/parameters.ts`, under the `pCloud` key (for both `dev` and `prod`).
