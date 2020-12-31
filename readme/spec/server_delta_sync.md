# Joplin Server delta sync

This documentation is meant to provide a high level overview of delta sync API. Exact technical details might change over time and would be documented separately in an API doc.

Delta sync provides an API end point that gives a list of the latest change events since a particular point. At a high level, it works like so:

- User calls `/api/files/delta` and get a list of the latest changes on the sync target. They also get a `cursor` object that can be used to check for the latest changes at a later time. A `cursor` essentially represents a point in time.

- Later on, they call `/api/file/delta?cursor=CURSOR`, with the cursor they previously got, and they will get the latest events since that cursor. They will also get a new cursor, which they would use again to get the following events, and so on.

The events are tied to a particular parent ID - in other words it's only possible to list the changes associated with a particular directory (non-recursive). For now, this is sufficient for the purpose of Joplin synchronisation, but later on it might be possible to get the changes in a recursive way.

## What is a change event

An event can be "create", "update" or "detete" and is associated with a given file. The client uses this info to apply the change locally - creating, updating or deleting the file as needed.

Attached to the event, is also a copy of the file metadata, so the client doesn't need to a do a second request to fetch it.

Internally, the event also stores the file name and parent ID. This is used when an item is deleted since in that case the item ID only would not be sufficient to know where the item was initally stored.

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

In some cases, in particular when a delta cursor has expired, the server might throw an error with a "resyncRequired" error code. In that case, the client should discard their cursor and sync the complete data again from the beginning.

This error should be rare - currently it would only happen if the cursor is invalid. Later on, it will also happen when old events have been deleted after x months. So a client that has not synced in a long time might see this error. The error code could also be used to solve server-side errors in some rare cases.

When syncing from the start, there will be many "create" events for files that are already there locally. In that case, they should just be skipped.