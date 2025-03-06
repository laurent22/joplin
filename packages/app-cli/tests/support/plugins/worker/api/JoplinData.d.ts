import { ModelType } from '../../../BaseModel';
import Plugin from '../Plugin';
import { Path } from './types';
/**
 * This module provides access to the Joplin data API: https://joplinapp.org/help/api/references/rest_api
 * This is the main way to retrieve data, such as notes, notebooks, tags, etc.
 * or to update them or delete them.
 *
 * This is also what you would use to search notes, via the `search` endpoint.
 *
 * [View the demo plugin](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/simple)
 *
 * In general you would use the methods in this class as if you were using a REST API. There are four methods that map to GET, POST, PUT and DELETE calls.
 * And each method takes these parameters:
 *
 * * `path`: This is an array that represents the path to the resource in the form `["resourceName", "resourceId", "resourceLink"]` (eg. ["tags", ":id", "notes"]). The "resources" segment is the name of the resources you want to access (eg. "notes", "folders", etc.). If not followed by anything, it will refer to all the resources in that collection. The optional "resourceId" points to a particular resources within the collection. Finally, an optional "link" can be present, which links the resource to a collection of resources. This can be used in the API for example to retrieve all the notes associated with a tag.
 * * `query`: (Optional) The query parameters. In a URL, this is the part after the question mark "?". In this case, it should be an object with key/value pairs.
 * * `data`: (Optional) Applies to PUT and POST calls only. The request body contains the data you want to create or modify, for example the content of a note or folder.
 * * `files`: (Optional) Used to create new resources and associate them with files.
 *
 * Please refer to the [Joplin API documentation](https://joplinapp.org/help/api/references/rest_api) for complete details about each call. As the plugin runs within the Joplin application **you do not need an authorisation token** to use this API.
 *
 * For example:
 *
 * ```typescript
 * // Get a note ID, title and body
 * const noteId = 'some_note_id';
 * const note = await joplin.data.get(['notes', noteId], { fields: ['id', 'title', 'body'] });
 *
 * // Get all folders
 * const folders = await joplin.data.get(['folders']);
 *
 * // Set the note body
 * await joplin.data.put(['notes', noteId], null, { body: "New note body" });
 *
 * // Create a new note under one of the folders
 * await joplin.data.post(['notes'], null, { body: "my new note", title: "some title", parent_id: folders[0].id });
 * ```
 */
export default class JoplinData {
    private api_;
    private pathSegmentRegex_;
    private plugin;
    constructor(plugin: Plugin);
    private serializeApiBody;
    private pathToString;
    get(path: Path, query?: any): Promise<any>;
    post(path: Path, query?: any, body?: any, files?: any[]): Promise<any>;
    put(path: Path, query?: any, body?: any, files?: any[]): Promise<any>;
    delete(path: Path, query?: any): Promise<any>;
    itemType(itemId: string): Promise<ModelType>;
    resourcePath(resourceId: string): Promise<string>;
    /**
     * Gets an item user data. User data are key/value pairs. The `key` can be any
     * arbitrary string, while the `value` can be of any type supported by
     * [JSON.stringify](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#description)
     *
     * User data is synchronised across devices, and each value wil be merged based on their timestamp:
     *
     * - If value is modified by client 1, then modified by client 2, it will take the value from client 2
     * - If value is modified by client 1, then deleted by client 2, the value will be deleted after merge
     * - If value is deleted by client 1, then updated by client 2, the value will be restored and set to the value from client 2 after merge
     */
    userDataGet<T>(itemType: ModelType, itemId: string, key: string): Promise<T>;
    /**
     * Sets a note user data. See {@link JoplinData.userDataGet} for more details.
     */
    userDataSet<T>(itemType: ModelType, itemId: string, key: string, value: T): Promise<void>;
    /**
     * Deletes a note user data. See {@link JoplinData.userDataGet} for more details.
     */
    userDataDelete(itemType: ModelType, itemId: string, key: string): Promise<void>;
}
