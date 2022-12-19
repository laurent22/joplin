# Synchronising your notes

Joplin allows you to synchronise your data using various file hosting services. The supported cloud services are the following:

## Setting up Joplin Cloud synchronisation

[Joplin Cloud](https://joplinapp.org/plans/) is a web service specifically designed for Joplin. Besides synchronising your data, it also allows you to publish a note to the internet, or share a notebook with your friends, family or colleagues. Joplin Cloud, compared to other services, also features a number of performance improvements allowing for faster synchronisation.

To use it, go to the config screen, then to the Synchronisation section. In the list of sync target, select "Joplin Cloud". Enter your email and password, and you're ready to use Joplin Cloud.

## Setting up Dropbox synchronisation

Select "Dropbox" as the synchronisation target in the config screen. Then, to initiate the synchronisation process, click on the "Synchronise" button in the sidebar and follow the instructions.

## Setting up Nextcloud synchronisation

Nextcloud is a self-hosted, private cloud solution. To set it up, go to the config screen and select Nextcloud as the synchronisation target. Then input the WebDAV URL (to get it, go to your Nextcloud page, click on Settings in the bottom left corner of the page and copy the URL). Note that it has to be the **full URL**, so for example if you want the notes to be under `/Joplin`, the URL would be something like `https://example.com/remote.php/webdav/Joplin` (note that "/Joplin" part). And **make sure to create the "/Joplin" directory in Nextcloud**. Finally set the username and password. If it does not work, please [see this explanation](https://github.com/laurent22/joplin/issues/61#issuecomment-373282608) for more details.

## Setting up OneDrive or WebDAV synchronisation

OneDrive and WebDAV are also supported as synchronisation services. Please see [the synchronisation documentation](https://github.com/laurent22/joplin#synchronisation) for more information.

## Using End-To-End Encryption

Joplin supports end-to-end encryption (E2EE) on all the applications. E2EE is a system where only the owner of the data can read it. It prevents potential eavesdroppers - including telecom providers, internet providers, and even the developers of Joplin from being able to access the data. Please see the [End-To-End Encryption Tutorial](https://joplinapp.org/e2ee/) for more information about this feature and how to enable it.
