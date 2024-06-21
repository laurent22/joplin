import BaseCommand from './base-command';
import BaseItem from '@joplin/lib/models/BaseItem';
import BaseModel from '@joplin/lib/BaseModel';
const { toTitleCase } = require('@joplin/lib/string-utils.js');
import { reg } from '@joplin/lib/registry.js';
import markdownUtils, { MarkdownTableRow } from '@joplin/lib/markdownUtils';
import Database from '@joplin/lib/database';
import shim from '@joplin/lib/shim';

class Command extends BaseCommand {
	public override usage() {
		return 'apidoc <file>';
	}

	public override description() {
		return 'Build the API doc';
	}

	public override enabled() {
		return false;
	}

	private createPropertiesTable(tableFields: MarkdownTableRow[]) {
		const headers = [
			{ name: 'name', label: 'Name' },
			{
				name: 'type',
				label: 'Type',
				filter: (value: string|number) => {
					const valueAsNumber = typeof value === 'number' ? value : parseInt(value, 10);
					return Database.enumName('fieldType', valueAsNumber);
				},
			},
			{ name: 'description', label: 'Description' },
		];

		return markdownUtils.createMarkdownTable(headers, tableFields);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public override async action(args: any) {
		const models = [
			{
				type: BaseModel.TYPE_NOTE,
			},
			{
				type: BaseModel.TYPE_FOLDER,
			},
			{
				type: BaseModel.TYPE_RESOURCE,
			},
			{
				type: BaseModel.TYPE_TAG,
			},
			{
				type: BaseModel.TYPE_REVISION,
			},
		];

		const lines = [];

		lines.push('---');
		lines.push('sidebar_position: 2');
		lines.push('---');
		lines.push('');
		lines.push('# Joplin Data API');
		lines.push('');
		lines.push('This API is available when the clipper server is running. It provides access to the notes, notebooks, tags and other Joplin object via a REST API. Plugins can also access this API even when the clipper server is not running.');
		lines.push('');
		lines.push('In order to use it, you\'ll first need to find on which port the service is running. To do so, open the Web Clipper Options in Joplin and if the service is running it should tell you on which port. Normally it runs on port **41184**. If you want to find it programmatically, you may follow this kind of algorithm:');
		lines.push('');
		lines.push('```javascript');
		lines.push('let port = null;');
		lines.push('for (let portToTest = 41184; portToTest <= 41194; portToTest++) {');
		lines.push('    const result = pingPort(portToTest); // Call GET /ping');
		lines.push('    if (result == \'JoplinClipperServer\') {');
		lines.push('        port = portToTest; // Found the port');
		lines.push('        break;');
		lines.push('    }');
		lines.push('}');
		lines.push('```');
		lines.push('');

		lines.push('## Authorisation');
		lines.push('');
		lines.push('To prevent unauthorised applications from accessing the API, the calls must be authenticated. To do so, you must provide a token as a query parameter for each API call. You can get this token from the Joplin desktop application, on the Web Clipper Options screen.');
		lines.push('');
		lines.push('This would be an example of valid cURL call using a token:');
		lines.push('');
		lines.push('```shell\ncurl http://localhost:41184/notes?token=ABCD123ABCD123ABCD123ABCD123ABCD123\n```');
		lines.push('');
		lines.push('In the documentation below, the token will not be specified every time however you will need to include it.');
		lines.push('');
		lines.push('If needed you may also [request the token programmatically](https://github.com/laurent22/joplin/blob/dev/readme/dev/spec/clipper_auth.md)');
		lines.push('');

		lines.push('## Using the API');
		lines.push('');
		lines.push('All the calls, unless noted otherwise, receives and send **JSON data**. For example to create a new note:');
		lines.push('');
		lines.push('```shell\ncurl --data \'{ "title": "My note", "body": "Some note in **Markdown**"}\' http://localhost:41184/notes\n```');
		lines.push('');
		lines.push('In the documentation below, the calls may include special parameters such as :id or :note_id. You would replace this with the item ID or note ID.');
		lines.push('');
		lines.push('For example, for the endpoint `DELETE /tags/:id/notes/:note_id`, to remove the tag with ID "ABCD1234" from the note with ID "EFGH789", you would run for example:');
		lines.push('');
		lines.push('```shell\ncurl -X DELETE http://localhost:41184/tags/ABCD1234/notes/EFGH789\n```');
		lines.push('');
		lines.push('The four verbs supported by the API are the following ones:');
		lines.push('');
		lines.push('* **GET**: To retrieve items (notes, notebooks, etc.).');
		lines.push('* **POST**: To create new items. In general most item properties are optional. If you omit any, a default value will be used.');
		lines.push('* **PUT**: To update an item. Note in a REST API, traditionally PUT is used to completely replace an item, however in this API it will only replace the properties that are provided. For example if you PUT {"title": "my new title"}, only the "title" property will be changed. The other properties will be left untouched (they won\'t be cleared nor changed).');
		lines.push('* **DELETE**: To delete items.');
		lines.push('');

		lines.push('## Filtering data');
		lines.push('');
		lines.push('You can change the fields that will be returned by the API using the `fields=` query parameter, which takes a list of comma separated fields. For example, to get the longitude and latitude of a note, use this:');
		lines.push('');
		lines.push('```shell\ncurl http://localhost:41184/notes/ABCD123?fields=longitude,latitude\n```');
		lines.push('');
		lines.push('To get the IDs only of all the tags:');
		lines.push('');
		lines.push('```shell\ncurl http://localhost:41184/tags?fields=id\n```');
		lines.push('');
		lines.push('By default API results will contain the following fields: **id**, **parent_id**, **title**');
		lines.push('');

		lines.push('## Pagination');
		lines.push('');
		lines.push('All API calls that return multiple results will be paginated and will return the following structure:');
		lines.push('');
		lines.push('Key | Always present? | Description');
		lines.push('--- | --- | ---');
		lines.push('`items` | Yes | The array of items you have requested.');
		lines.push('`has_more` | Yes | If `true`, there are more items after this page. If `false`, it means you have reached the end of the data set.');
		lines.push('');
		lines.push('You can specify how the results should be sorted using the `order_by` and `order_dir` query parameters, and which page to retrieve using the `page` parameter (starts at and defaults to 1). You can specify the number of items to be returned using the `limit` parameter (the maximum being 100 items).');
		lines.push('');
		lines.push('The following call for example will initiate a request to fetch all the notes, 10 at a time, and sorted by "updated_time" ascending:');
		lines.push('');
		lines.push('```shell\ncurl http://localhost:41184/notes?order_by=updated_time&order_dir=ASC&limit=10\n```');
		lines.push('');
		lines.push('This will return a result like this');
		lines.push('');
		lines.push('```json\n{ "items": [ /* 10 notes */ ], "has_more": true }\n```');
		lines.push('');
		lines.push('Then you will resume fetching the results using this query:');
		lines.push('');
		lines.push('```shell\ncurl http://localhost:41184/notes?order_by=updated_time&order_dir=ASC&limit=10&page=2\n```');
		lines.push('');
		lines.push('Eventually you will get some results that do not contain an "has_more" parameter, at which point you will have retrieved all the results');
		lines.push('');
		lines.push('As an example the pseudo-code below could be used to fetch all the notes:');
		lines.push('');
		lines.push('```javascript');
		lines.push(`
async function fetchJson(url) {
	return (await fetch(url)).json();
}

async function fetchAllNotes() {
	let pageNum = 1;
	do {
		const response = await fetchJson((http://localhost:41184/notes?page=' + pageNum++);
		console.info('Printing notes:', response.items);
	} while (response.has_more)
}`);
		lines.push('```');
		lines.push('');

		lines.push('## Error handling');
		lines.push('');
		lines.push('In case of an error, an HTTP status code >= 400 will be returned along with a JSON object that provides more info about the error. The JSON object is in the format `{ "error": "description of error" }`.');
		lines.push('');

		lines.push('## About the property types');
		lines.push('');
		lines.push('* Text is UTF-8.');
		lines.push('* All date/time are Unix timestamps in milliseconds.');
		lines.push('* Booleans are integer values 0 or 1.');
		lines.push('');

		lines.push('## Testing if the service is available');
		lines.push('');
		lines.push('Call **GET /ping** to check if the service is available. It should return "JoplinClipperServer" if it works.');
		lines.push('');

		lines.push('## Searching');
		lines.push('');
		lines.push('Call **GET /search?query=YOUR_QUERY** to search for notes. This end-point supports the `field` parameter which is recommended to use so that you only get the data that you need. The query syntax is as described in the main documentation: https://joplinapp.org/help/#searching');
		lines.push('');
		lines.push('To retrieve non-notes items, such as notebooks or tags, add a `type` parameter and set it to the required [item type name](#item-type-id). In that case, full text search will not be used - instead it will be a simple case-insensitive search. You can also use `*` as a wildcard. This is convenient for example to retrieve notebooks or tags by title.');
		lines.push('');
		lines.push('For example, to retrieve the notebook named `recipes`: **GET /search?query=recipes&type=folder**');
		lines.push('');
		lines.push('To retrieve all the tags that start with `project-`: **GET /search?query=project-*&type=tag**');
		lines.push('');

		lines.push('## Item type IDs');
		lines.push('');
		lines.push('Item type IDs might be referred to in certain objects you will retrieve from the API. This is the correspondence between name and ID:');
		lines.push('');
		lines.push('Name | Value');
		lines.push('---- | -----');
		for (const t of BaseModel.typeEnum_) {
			const value = t[1];
			lines.push(`${BaseModel.modelTypeToName(value)} | ${value}   `);
		}
		lines.push('');

		for (let i = 0; i < models.length; i++) {
			const model = models[i];
			const ModelClass = BaseItem.getClassByItemType(model.type);
			const tableName = ModelClass.tableName();
			let tableFields = reg.db().tableFields(tableName, { includeDescription: true });
			const singular = tableName.substr(0, tableName.length - 1);

			if (model.type === BaseModel.TYPE_NOTE) {
				tableFields = tableFields.slice();
				tableFields.push({
					name: 'body_html',
					type: Database.enumId('fieldType', 'text'),
					description: 'Note body, in HTML format',
				});
				tableFields.push({
					name: 'base_url',
					type: Database.enumId('fieldType', 'text'),
					description: 'If `body_html` is provided and contains relative URLs, provide the `base_url` parameter too so that all the URLs can be converted to absolute ones. The base URL is basically where the HTML was fetched from, minus the query (everything after the \'?\'). For example if the original page was `https://stackoverflow.com/search?q=%5Bjava%5D+test`, the base URL is `https://stackoverflow.com/search`.',
				});
				tableFields.push({
					name: 'image_data_url',
					type: Database.enumId('fieldType', 'text'),
					description: 'An image to attach to the note, in [Data URL](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs) format.',
				});
				tableFields.push({
					name: 'crop_rect',
					type: Database.enumId('fieldType', 'text'),
					description: 'If an image is provided, you can also specify an optional rectangle that will be used to crop the image. In format `{ x: x, y: y, width: width, height: height }`',
				});
			}

			lines.push(`## ${toTitleCase(tableName)}`);
			lines.push('');

			if (model.type === BaseModel.TYPE_FOLDER) {
				lines.push('This is actually a notebook. Internally notebooks are called "folders".');
				lines.push('');
			}

			lines.push('### Properties');
			lines.push('');
			lines.push(this.createPropertiesTable(tableFields));
			lines.push('');

			lines.push(`### GET /${tableName}`);
			lines.push('');
			lines.push(`Gets all ${tableName}`);
			lines.push('');

			if (model.type === BaseModel.TYPE_FOLDER) {
				lines.push('The folders are returned as a tree. The sub-notebooks of a notebook, if any, are under the `children` key.');
				lines.push('');
			}

			if (model.type === BaseModel.TYPE_NOTE) {
				lines.push('By default, this call will return the all notes **except** the notes in the trash folder and any conflict note. To include these too, you can specify `include_deleted=1` and `include_conflicts=1` as query parameters.');
				lines.push('');
			}

			lines.push(`### GET /${tableName}/:id`);
			lines.push('');
			lines.push(`Gets ${singular} with ID :id`);
			lines.push('');

			if (model.type === BaseModel.TYPE_TAG) {
				lines.push('### GET /tags/:id/notes');
				lines.push('');
				lines.push('Gets all the notes with this tag.');
				lines.push('');
			}

			if (model.type === BaseModel.TYPE_NOTE) {
				lines.push('### GET /notes/:id/tags');
				lines.push('');
				lines.push('Gets all the tags attached to this note.');
				lines.push('');

				lines.push('### GET /notes/:id/resources');
				lines.push('');
				lines.push('Gets all the resources attached to this note.');
				lines.push('');
			}

			if (model.type === BaseModel.TYPE_FOLDER) {
				lines.push('### GET /folders/:id/notes');
				lines.push('');
				lines.push('Gets all the notes inside this folder.');
				lines.push('');
			}

			if (model.type === BaseModel.TYPE_RESOURCE) {
				lines.push('### GET /resources/:id/file');
				lines.push('');
				lines.push('Gets the actual file associated with this resource.');
				lines.push('');

				lines.push('### GET /resources/:id/notes');
				lines.push('');
				lines.push('Gets the notes (IDs) associated with a resource.');
				lines.push('');
			}

			lines.push(`### POST /${tableName}`);
			lines.push('');
			lines.push(`Creates a new ${singular}`);
			lines.push('');

			if (model.type === BaseModel.TYPE_RESOURCE) {
				lines.push('Creating a new resource is special because you also need to upload the file. Unlike other API calls, this one must have the "multipart/form-data" Content-Type. The file data must be passed to the "data" form field, and the other properties to the "props" form field. An example of a valid call with cURL would be:');
				lines.push('');
				lines.push('```shell\ncurl -F \'data=@/path/to/file.jpg\' -F \'props={"title":"my resource title"}\' http://localhost:41184/resources\n```');
				lines.push('');
				lines.push('To **update** the resource content, you can make a PUT request with the same arguments:');
				lines.push('');
				lines.push('```shell\ncurl -X PUT -F \'data=@/path/to/file.jpg\' -F \'props={"title":"my modified title"}\' http://localhost:41184/resources/8fe1417d7b184324bf6b0122b76c4696\n```');
				lines.push('');
				lines.push('The "data" field is required, while the "props" one is not. If not specified, default values will be used.');
				lines.push('');
				lines.push('Or if you only need to update the resource properties (title, etc.), without changing the content, you can make a regular PUT request:');
				lines.push('');
				lines.push('```shell\ncurl -X PUT --data \'{"title": "My new title"}\' http://localhost:41184/resources/8fe1417d7b184324bf6b0122b76c4696\n```');
				lines.push('');
				lines.push('**From a plugin** the syntax to create a resource is also a bit special:');
				lines.push('');
				lines.push('```javascript');
				lines.push('\tawait joplin.data.post(');
				lines.push('\t\t["resources"],');
				lines.push('\t\tnull,');
				lines.push('\t\t{ title: "test.jpg" }, // Resource metadata');
				lines.push('\t\t[');
				lines.push('\t\t\t{');
				lines.push('\t\t\t\tpath: "/path/to/test.jpg", // Actual file');
				lines.push('\t\t\t},');
				lines.push('\t\t]');
				lines.push('\t);');
				lines.push('```');
			}

			if (model.type === BaseModel.TYPE_TAG) {
				lines.push('### POST /tags/:id/notes');
				lines.push('');
				lines.push('Post a note to this endpoint to add the tag to the note. The note data must at least contain an ID property (all other properties will be ignored).');
				lines.push('');
			}

			if (model.type === BaseModel.TYPE_NOTE) {
				lines.push('You can either specify the note body as Markdown by setting the `body` parameter, or in HTML by setting the `body_html`.');
				lines.push('');
				lines.push('Examples:');
				lines.push('');
				lines.push('* Create a note from some Markdown text');
				lines.push('');
				lines.push('```shell\ncurl --data \'{ "title": "My note", "body": "Some note in **Markdown**"}\' http://127.0.0.1:41184/notes\n```');
				lines.push('');
				lines.push('* Create a note from some HTML');
				lines.push('');
				lines.push('```shell\ncurl --data \'{ "title": "My note", "body_html": "Some note in <b>HTML</b>"}\' http://127.0.0.1:41184/notes\n```');
				lines.push('');
				lines.push('* Create a note and attach an image to it:');
				lines.push('');
				lines.push('```shell\ncurl --data \'{ "title": "Image test", "body": "Here is Joplin icon:", "image_data_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAANZJREFUeNoAyAA3/wFwtO3K6gUB/vz2+Prw9fj/+/r+/wBZKAAExOgF4/MC9ff+MRH6Ui4E+/0Bqc/zutj6AgT+/Pz7+vv7++nu82c4DlMqCvLs8goA/gL8/fz09fb59vXa6vzZ6vjT5fbn6voD/fwC8vX4UiT9Zi//APHyAP8ACgUBAPv5APz7BPj2+DIaC2o3E+3o6ywaC5fT6gD6/QD9/QEVf9kD+/dcLQgJA/7v8vqfwOf18wA1IAIEVycAyt//v9XvAPv7APz8LhoIAPz9Ri4OAgwARgx4W/6fVeEAAAAASUVORK5CYII="}\' http://127.0.0.1:41184/notes\n```');
				lines.push('');
				lines.push('#### Creating a note with a specific ID');
				lines.push('');
				lines.push('When a new note is created, it is automatically assigned a new unique ID so **normally you do not need to set the ID**. However, if for some reason you want to set it, you can supply it as the `id` property. It needs to be a **32 characters long string** in hexadecimal. **Make sure it is unique**, for example by generating it using whatever GUID function is available in your programming language.');
				lines.push('');
				lines.push('```shell\ncurl --data \'{ "id": "00a87474082744c1a8515da6aa5792d2", "title": "My note with custom ID"}\' http://127.0.0.1:41184/notes\n```');
				lines.push('');
			}

			lines.push(`### PUT /${tableName}/:id`);
			lines.push('');
			lines.push(`Sets the properties of the ${singular} with ID :id`);
			lines.push('');

			if (model.type === BaseModel.TYPE_RESOURCE) {
				lines.push('You may also update the file data by specifying a file (See `POST /resources` example).');
				lines.push('');
			}

			lines.push(`### DELETE /${tableName}/:id`);
			lines.push('');
			lines.push(`Deletes the ${singular} with ID :id`);
			lines.push('');

			if (model.type === BaseModel.TYPE_TAG) {
				lines.push('### DELETE /tags/:id/notes/:note_id');
				lines.push('');
				lines.push('Remove the tag from the note.');
				lines.push('');
			}

			if (model.type === BaseModel.TYPE_NOTE || model.type === BaseModel.TYPE_FOLDER) {
				lines.push(`By default, the ${singular} will be moved **to the trash**. To permanently delete it, add the query parameter \`permanent=1\``);
				lines.push('');
			}
		}

		{
			const tableFields = reg.db().tableFields('item_changes', { includeDescription: true });

			lines.push('## Events');
			lines.push('');
			lines.push('This end point can be used to retrieve the latest note changes. Currently only note changes are tracked.');
			lines.push('');
			lines.push('### Properties');
			lines.push('');
			lines.push(this.createPropertiesTable(tableFields));
			lines.push('');
			lines.push('### GET /events');
			lines.push('');
			lines.push('Returns a paginated list of recent events. A `cursor` property should be provided, which tells from what point in time the events should be returned. The API will return a `cursor` property, to tell from where to resume retrieving events, as well as an `has_more` (tells if more changes can be retrieved) and `items` property, which will contain the list of events. Events are kept for up to 90 days.');
			lines.push('');
			lines.push('If no `cursor` property is provided, the API will respond with the latest change ID. That can be used to retrieve future events later on.');
			lines.push('');
			lines.push('The results are paginated so you may need multiple calls to retrieve all the events. Use the `has_more` property to know if more can be retrieved.');
			lines.push('');
			lines.push('### GET /events/:id');
			lines.push('');
			lines.push('Returns the event with the given ID.');
		}

		const outFilePath = args['file'];

		await shim.fsDriver().writeFile(outFilePath, lines.join('\n'), 'utf8');
	}
}

module.exports = Command;
