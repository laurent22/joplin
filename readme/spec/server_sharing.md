# Joplin Server sharing feature

## Sharing a notebook with a user

Sharing a notebook is done via synchronisation using the following API objects:

- `item`: any Joplin item such as a note or notebook.
- `user_item`: owned by a user and points to an item. Multiple user_items can point to the same item, which is important to enable sharing.
- `share`: associated with a notebook ID, it specifies which notebook should be shared and by whom
- `share_user`: associated with share and a user. This is essentially an invitation that the sharer sent to recipients. There can be multiple such objects, and they can be accepted or rejected by the recipient.

The process to share is then:

- First, the sharer calls `POST /api/shares` with the notebook ID that needs to be shared.
- Then invitations can be sent by calling `POST /api/share_users` and providing the share ID and recipient email.
- The recipient accept or reject the application by setting the status on the `share_users` object (which corresponds to an invitation).

Once share is setup, the client recursively goes through all notes, sub-notebooks and resources within the shared notebook, and set their `share_id` property. Basically any item within the notebook should have this property set. Then all these items are synchronized.

On the server, a service is running at regular interval to check the `share_id` property, and generate `user_item` objects for each recipient. Once these objects have been created, the recipient will start receiving the shared notebooks and notes.

### Why is the share_id set on the client and not the server?

Technically, the server would only need to know the root shared folder, and from that can be find out its children. This approach was tried but it makes the system much more complex because some information is lost after sync - in particular when notes or notebooks are moved out of folders, when resources are attached or removed, etc. Keeping track of all this is possible but complex and inefficient.

On the other hand, all that information is present on the client. Whenever a notes is moved out a shared folder, or whenever a resources is attached, the changes are tracked, and that can be used to easily assign a `share_id` property. Once this is set, it makes the whole system more simple and reliable.

## Publishing a note via a public URL 

This is done by posting a note ID to `/api/shares`.

### Attached resources

Any resource attached to the note is also shared - so for example images will be displayed, and it will be possible to open any attached PDF. 

### Linked note

Any linked note will **not** be shared, due to the following reasons:

- Privacy issue - you don't want to accidentally share a note just because it was linked from another note.

- Even if the linked note has been shared separately, we still don't give access to it. We don't know who that link has been shared with - it could be a different recipient.

### Multiple share links for a given note

It should be possible to have multiple share links for a given note. For example: I share a note with one person, then the same note with a different person. I revoke the share for one person, but I sill want the other person to access the note.

So when a share link is created for a note, the API always returns a new link.
