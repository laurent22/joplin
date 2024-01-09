# Synchronisation

One of the goals of Joplin is to avoid being tied to any particular company or service, whether it is Evernote, Google or Microsoft. As such the synchronisation is designed without any hard dependency to any particular service. Most of the synchronisation process is done at an abstract level and access to external services, such as Nextcloud or Dropbox, is done via lightweight drivers. It is easy to support new services by creating simple drivers that provide a filesystem-like interface, i.e. the ability to read, write, delete and list items. It is also simple to switch from one service to another.

Currently, synchronisation is possible with Joplin Cloud, Nextcloud, S3, WebDAV, Dropbox, OneDrive or the local filesystem. To enable synchronisation please follow the instructions below. After that, the application will synchronise in the background whenever it is running, or you can click on "Synchronise" to start a synchronisation manually. Joplin will background sync automatically after any content change is made on the local application.

If the **terminal client** has been installed, it is possible to also synchronise outside of the user interface by typing `joplin sync` from the terminal. This can be used to setup a cron script to synchronise at a regular interval. For example, this would do it every 30 minutes:

` */30 * * * * /path/to/joplin sync`

## Synchronisation and Migration

If migrating from another application (e.g. Evernote) you will need to export your data from the old app then import it into Joplin, which can be done before or after you set up synchronization in Joplin. But once you have (a) set up synchronization and (b) imported your data, it can take some time (minutes or hours) before Joplin synchronizes all that data.

**Important:** 
The main reason to use synchronization is so that you can use the same data on more than one machine. But you should not try to set up synchronization on any additional machines until your original migrated data has been fully synchronized. Otherwise, it will look like Joplin is broken, missing some of your notes and/or notebooks. So monitor your (upload) synchronization progress via `Help >> Synchronization Status` until it shows complete; only then should you start synchronization (downloads) on other machines.
