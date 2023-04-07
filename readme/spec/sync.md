# Joplin synchronisation

The Joplin applications are offline first - it means that data is saved locally on the device. In order to have the same data on all the user's devices, we use a synchronisation process. In a nutshell, each device uploads its notes, notebooks, tags, etc. to the server, and also downloads any notes they do not have, or any recent changes. If a note is deleted, it is also deleted from the server, and eventually deleted from each device too.

## Vocabulary

### Clients

The sync clients are the Joplin applications - the desktop, mobile and terminal applications.

### Sync targets

The sync target is the location where the data is going to be saved. It can be for example Joplin Server, a Nextcloud instance, or a WebDAV server.

### Items

The "items" are the notes, notebooks, tags and resources that need to be synced.

## General process

Whenever the user makes a change to an item, it is uploaded to the sync target within a few seconds. Uploading items as soon as possible helps limit conflicts. Because that way, any client that connects to the sync target is more likely to get the latest version of the item.

Additionally, every few minutes, the client is going to poll the server and download the latest changes, and apply them to the local note collection.

## Code architecture

- `packages/lib/Synchronizer.ts`: This file is responsible for the main synchronisation process. It download changes, upload them, and apply any deletion. The class is relatively generic and receive a `SyncTarget` object that handles sync target-specific operations. The synchroniser is also going encrypt and decrypt items if E2EE is enabled.

- `packages/lib/SyncTarget*.ts`: These files are the entry points for the various sync targets. They expose some metadata such as name, description, what options they support, etc. Some may also implement a function to test whether the configuration is working (used from the configuration screen). Finally, the main role of this class is to initialise an instance of a `FileApi`.

- `packages/lib/file-api-driver-*.ts`: Those are the file APIs. They must implement generic file-like operations to create, update, delete or list files. This API is in turn used by the synchroniser to created, update or delete items.

- `packages/lib/*Api.ts`: The `file-api-driver` will call some low-level API to perform its operations. For example `file-api-driver-local` will use the `fs` package to read/write files, `file-api-driver-amazon-s3` will use the AWS API to work with S3. In some cases however such a low-level API is not available - in that case, we usually create an `*Api.ts` file, which is used by the file API driver to perform its operations. For example, there is a `JoplinServerApi.ts`, which is used to connect to Joplin Server.

## See also

- [Synchronisation lock](https://github.com/laurent22/joplin/blob/dev/readme/spec/sync_lock.md)
- [E2EE: Technical spec](https://github.com/laurent22/joplin/blob/dev/readme/spec/e2ee.md)
- [E2EE: Workflow](https://github.com/laurent22/joplin/blob/dev/readme/spec/e2ee/workflow.md)
