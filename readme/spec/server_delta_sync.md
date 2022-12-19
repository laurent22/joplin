# Joplin Server delta sync

This documentation is meant to provide a high level overview of delta sync API. Exact technical details might change over time and would be documented separately in an API doc.

Delta sync provides an API end point that gives a list of the latest change events since a particular point. At a high level, it works like so:

- User calls `/api/files/delta` and get a list of the latest changes on the sync target. They also get a `cursor` object that can be used to check for the latest changes at a later time. A `cursor` essentially represents a point in time.

- Later on, they call `/api/file/delta?cursor=CURSOR`, with the cursor they previously got, and they will get the latest events since that cursor. They will also get a new cursor, which they would use again to get the following events, and so on.

The events are tied to a particular parent ID - in other words it's only possible to list the changes associated with a particular directory (non-recursive). For now, this is sufficient for the purpose of Joplin synchronisation, but later on it might be possible to get the changes in a recursive way.

## What is a change event

An event can be "create", "update" or "delete" and is associated with a given file. The client uses this info to apply the change locally - creating, updating or deleting the file as needed.

Attached to the event, is also a copy of the file metadata, so the client doesn't need to a do a second request to fetch it.

Internally, the event also stores the file name and parent ID. This is used when an item is deleted since in that case the item ID only would not be sufficient to know where the item was initially stored.

## Event compression

To reduce the data being transferred, the API compresses the events by removing redundant ones. For example, multiple updates are compressed into one, since the client only need to know that the item has been updated at least once. The following rules are currently applied to compress the events:

Event sequence | Result | Description
--- | --- | ---
update - update | update | If an item is updated twice or more, we only send one update event back
create - update | create | If an item has been created then modified, we only send one create event, with the latest version of the file
create - delete | NOOP | If an item has been created, then deleted, we don't send anything back. For the client, this file has never existed.
update - delete | delete | If an item is updated multiple times, then deleted, we only send a "delete" event back.

Compression works at a page-level so depending on how many items are requested via the `limit` parameters, different compression will apply.

Due to this compression, the `limit` query parameter is only advisory. There's no guarantee that exactly `limit` items will be returned as some items might have been removed after compression. There's however a guarantee that no more than `limit` items will be returned.

## Delete event limitation

There's currently a known limitation regarding delete events. When looking at a particular event page, the server might find that a "create" or "update" event is associated with a non-existing file, which would have been deleted. In that case, the server will send back a "delete" event. When looking at following pages, the server will eventually process the actual "delete" event for that item - and send again a "delete" event for it.

This is a known issue and to solve it would require looking ahead in event pages, which would slow down the process. It means it's expected that a client might receive a "delete" event for a file, even though it has no such file or has already deleted it. In that case, the processing for that "delete" event should be a noop, not an error.

## ResyncRequired error

In some cases, in particular when a delta cursor has expired or is invalid, the server might throw an error with a "resyncRequired" error code. In that case, the client should discard their cursor and sync the complete data again from the beginning.

This error should be rare - currently it would only happen if the cursor is invalid. Later on, it will also happen when old events have been deleted after x months. So a client that has not synced in a long time might see this error. The error code could also be used to solve server-side errors in some rare cases.

When syncing from the start, there will be many "create" events for files that are already there locally. In that case, they should just be skipped.

## Regarding the deletion of old change events

**2021-10-22**

### Handling UPDATE events

**Update events** older than x days (currently 180 days) will be automatically compressed, by deleting all events except the latest one. For example, if a note has been modified on July 2, July 7 and July 15, only the July 15 event will be kept.

It means that a client that has not synced for more than 180 days is likely to get a "resyncRequired" error code if the sync cursor they had correspond to a change that has been deleted. When that happens a full sync will start from the beginning.

This side effect is considered acceptable because:

- It is unlikely that a client won't be synced for more than 180 days.
- No data loss will occur.
- The need to do a full sync again, while annoying, is not a major issue in most cases.

### Handling CREATE and DELETE events

Currently **Create** and **Delete** events are not automatically deleted. This is because clients build their data based on the Create/Update/Delete events so if we delete the CREATE events, certain notes will no longer be created on new clients.

A possible solution would be to have this kind of logic client side: When a sync cursor is invalid, do a full sync, which will not rely on /delta but on the basicDelta() function as used for file system or webdav sync. It will simply compare what's on the server with what's on the client and do the sync like this. Once it's done, it can start using /delta again. Advantage if that it can be done using basicDelta(). Disadvantage is that it's not possible accurately enumerate the server content that way, since new items can be created or deleted during that basicDelta process.

A possibly more reliable technique would be to delete all Create/Delete event pairs. Doing so won't affect new clients - which simply won't get any CREATE event, since the item has been deleted anyway. It will affect clients that did not sync for a long time because they won't be notified that an item has been deleted - but that's probably an acceptable side effect. The main trouble will be the shared notes and notebooks - we'd need to make sure that when we delete something from a user it doesn't incorrectly delete it from another user (I don't think it would, but that will need to be considered).

**2021-01-01**

**Obsolete**

Keeping all change events permanently would represent a lot of data, however it might be necessary. Without it, it won't be possible for a client to know what file has been deleted and thus a client that has not synced for a long time will keep its files permanently.

So most likely we'll always keep the change events. However, we could compress the old ones to just "create" and "delete" events. All "update" events are not needed. And for a file that has been deleted, we don't need to keep the "create" event.

The client would then follow this logic:

- For "create" events:
	- If the file is present locally, update it with the version from the server.
	- If the file is not present, create it using the version from the server.
- For "delete" events:
	- If the file is present, delete it.
	- If it is not, skip the event (not an error).

It might seem we could derive the "create" events simply by looking at the files in the directory - all files that are there would implicitly have a "create" event. The issue however is that it's not possible to reliably iterate over the files in a folder, because they might change in the meantime. The change events on the other hand provide an ID that can be used reliably to iterate over changes, and to resume at any time.