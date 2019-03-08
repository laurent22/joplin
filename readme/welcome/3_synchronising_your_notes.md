# Synchronising your notes 🔄

One of the goals of Joplin was to avoid being tied to any particular company or service, whether it is Evernote, Google or Microsoft. As such the synchronisation is designed without any hard dependency to any particular service. You basically choose the service you prefer among those supported, setup the configuration, and the app will be able to sync between your computers or mobile devices.

The supported cloud services are the following:

## Setting up Dropbox synchronisation

Select "Dropbox" as the synchronisation target in the config screen (it is selected by default). Then, to initiate the synchronisation process, click on the "Synchronise" button in the sidebar and follow the instructions.

## Setting up Nextcloud synchronisation

Nextcloud is a self-hosted, private cloud solution. It can store documents, images and videos but also calendars, passwords and countless other things and can sync them to your laptop or phone. As you can host your own Nextcloud server, you own both the data on your device and infrastructure used for synchronisation. As such it is a good fit for Joplin.

To set it up, go to the config screen and select Nextcloud as the synchronisation target. Then input the WebDAV URL (to get it, go to your Nextcloud page, click on Settings in the bottom left corner of the page and copy the URL). Note that it has to be the **full URL**, so for example if you want the notes to be under `/Joplin`, the URL would be something like `https://example.com/remote.php/webdav/Joplin` (note that "/Joplin" part). And **make sure to create the "/Joplin" directory in Nextcloud**. Finally set the username and password. If it does not work, please [see this explanation](https://github.com/laurent22/joplin/issues/61#issuecomment-373282608) for more details.

## Setting up OneDrive or WebDAV synchronisation

OneDrive and WebDAV are also supported as synchronisation services. Please see [the export documentation](https://github.com/laurent22/joplin#exporting) for more information.

## Using End-To-End Encryption

Joplin supports end-to-end encryption (E2EE) on all the applications. E2EE is a system where only the owner of the data can read it. It prevents potential eavesdroppers - including telecom providers, internet providers, and even the developers of Joplin from being able to access the data. Please see the [End-To-End Encryption Tutorial](https://joplin.cozic.net/e2ee/) for more information about this feature and how to enable it.