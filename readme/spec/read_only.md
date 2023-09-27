# Read-only

Certain Joplin items can potentially be marked as read-only. The notes, folders and resources support this. Currently, it is used when a Joplin Cloud folder is shared with a disabled "write" permission.

Support for read-only items is implemented at multiple levels:

- On Joplin Cloud
- On the apps: at the model level
- On the apps: at the UI level
- On the apps: at the sync level

## On Joplin Cloud

Joplin Cloud ensures that it is not possible to write an item to a read-only share, except if you are the share owner. When it is attempted, a 403 Forbidden error is returned along with an error code `{ "code": "isReadOnly" }`.

## On the applications

The desktop, mobile and CLI apps support read-only notes, resources or folders.

### At the sync level

Because Joplin Cloud can return read-only-specific errors, the synchroniser needs to handle them.

- If a local read-only item has been modified, and the synchroniser tries to upload it, Joplin Cloud responds with a read-only error. The synchroniser local item is copied to the conflict folder and the remote item overwrites the local one.

- If a local read-only item has been deleted, and the synchroniser tries to delete the remote one, Joplin Cloud responds with a read-only error. The synchroniser downloads the remote item and restore the local one.

- If a local item has been added as a child of a read-only folder, and the synchroniser tries to apply the change, Joplin Cloud responds with a read-only error. The local item is copied to the conflict folder and is deleted.

In theory these errors should never happen since they are prevented at the model and UI level but they are handled anyway because sync would be permanently stuck if it cannot handle a read-only error. Moreover the user local items would be inconsistent with the shared folder, with no way of getting the current data.

## At the model level

`lib/models/utils/readOnly.ts` provides a number of utility functions to decide if an item should be considered read-only or not.

Most of the read-only handling is done in `BaseItem` so the note, folder and resource handling is very similar.

Four cases are handled:

- Modifying a read-only item
- Deleting a read-only item
- Adding an item as a child of a read-only item
- Modifying a read-only resource file content

## At the UI level

Likewise `readOnly.ts` is used to find out if an item is read-only and to disable menu items, editors, commands, etc.
