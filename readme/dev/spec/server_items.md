# Joplin Server items

To upload an item to Joplin Server:

- Call `PUT /api/items` with the serialized Joplin item. Examples of serialized items are described in `packages/app-cli/tests/support/syncTargetSnapshots`

- That route is in `packages/server/src/routes/api/items.ts`. In there it's going to do some basic processing on the item, and eventually will call `models.item().saveFromRawContent`

- This `saveFromRawContent` is where most of the job is done - it's going to detect what the item is, whether it's a note, notebook, etc. (this is the serialised content, as described above), or a binary file (resource).

	- If it's a resource, the content is going to be saved as-is in the database

	- If it's an item, it's going to deserialise it because we want to save certain properties separately in the database, such as the parent ID, the type (whether it's a note, notebook, etc.). We save these properties separately purely for performance reasons. Once the properties have been extracted, the rest of the object is serialised back to JSON and saved to the database.

- In the end, the content is saved to the `items` table. The JSON item or the resource binary content will be saved to the `content` field. Other Joplin items properties will be saved to the `jop_*` fields. For example, the ID, the parent ID, whether encryption is enabled, etc.

- `items.jop_id` is the ID as it was generated on the client. `items.id` is the server-side ID. We need two different IDs because we have no way to guarantee that `items.jop_id` is globally unique since it's generated client-side.

- In `ItemModel` there are various utility functions to deal with the content. This is because it may be saved in different places depending on configuration. It can be saved to the `items.content` field in the database, or it can be saved to S3, or to the filesystem. This is why any code that deals with item content must used these utility functions.
