const { BaseCommand } = require('./base-command.js');
const BaseItem = require('lib/models/BaseItem');
const BaseModel = require('lib/BaseModel');
const { toTitleCase } = require('lib/string-utils.js');
const { reg } = require('lib/registry.js');
const markdownUtils = require('lib/markdownUtils');
const { Database } = require('lib/database.js');

class Command extends BaseCommand {
	usage() {
		return 'apidoc';
	}

	description() {
		return 'Build the API doc';
	}

	createPropertiesTable(tableFields) {
		const headers = [
			{ name: 'name', label: 'Name' },
			{
				name: 'type',
				label: 'Type',
				filter: value => {
					return Database.enumName('fieldType', value);
				},
			},
			{ name: 'description', label: 'Description' },
		];

		return markdownUtils.createMarkdownTable(headers, tableFields);
	}

	async action() {
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
		];

		const lines = [];

		lines.push('# Joplin API');
		lines.push('');

		lines.push('When the Web Clipper service is enabled, Joplin exposes a [REST API](https://en.wikipedia.org/wiki/Representational_state_transfer) which allows third-party applications to access Joplin\'s data and to create, modify or delete notes, notebooks, resources or tags.');
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

		lines.push('# Authorisation');
		lines.push('');
		lines.push('To prevent unauthorised applications from accessing the API, the calls must be authentified. To do so, you must provide a token as a query parameter for each API call. You can get this token from the Joplin desktop application, on the Web Clipper Options screen.');
		lines.push('');
		lines.push('This would be an example of valid cURL call using a token:');
		lines.push('');
		lines.push('\tcurl http://localhost:41184/notes?token=ABCD123ABCD123ABCD123ABCD123ABCD123');
		lines.push('');
		lines.push('In the documentation below, the token will not be specified every time however you will need to include it.');
		lines.push('');

		lines.push('# Using the API');
		lines.push('');
		lines.push('All the calls, unless noted otherwise, receives and send **JSON data**. For example to create a new note:');
		lines.push('');
		lines.push('\tcurl --data \'{ "title": "My note", "body": "Some note in **Markdown**"}\' http://localhost:41184/notes');
		lines.push('');
		lines.push('In the documentation below, the calls may include special parameters such as :id or :note_id. You would replace this with the item ID or note ID.');
		lines.push('');
		lines.push('For example, for the endpoint `DELETE /tags/:id/notes/:note_id`, to remove the tag with ID "ABCD1234" from the note with ID "EFGH789", you would run for example:');
		lines.push('');
		lines.push('\tcurl -X DELETE http://localhost:41184/tags/ABCD1234/notes/EFGH789');
		lines.push('');
		lines.push('The four verbs supported by the API are the following ones:');
		lines.push('');
		lines.push('* **GET**: To retrieve items (notes, notebooks, etc.).');
		lines.push('* **POST**: To create new items. In general most item properties are optional. If you omit any, a default value will be used.');
		lines.push('* **PUT**: To update an item. Note in a REST API, traditionally PUT is used to completely replace an item, however in this API it will only replace the properties that are provided. For example if you PUT {"title": "my new title"}, only the "title" property will be changed. The other properties will be left untouched (they won\'t be cleared nor changed).');
		lines.push('* **DELETE**: To delete items.');
		lines.push('');

		lines.push('# Filtering data');
		lines.push('');
		lines.push('You can change the fields that will be returned by the API using the `fields=` query parameter, which takes a list of comma separated fields. For example, to get the longitude and latitude of a note, use this:');
		lines.push('');
		lines.push('\tcurl http://localhost:41184/notes/ABCD123?fields=longitude,latitude');
		lines.push('');
		lines.push('To get the IDs only of all the tags:');
		lines.push('');
		lines.push('\tcurl http://localhost:41184/tags?fields=id');
		lines.push('');

		lines.push('# Error handling');
		lines.push('');
		lines.push('In case of an error, an HTTP status code >= 400 will be returned along with a JSON object that provides more info about the error. The JSON object is in the format `{ "error": "description of error" }`.');
		lines.push('');

		lines.push('# About the property types');
		lines.push('');
		lines.push('* Text is UTF-8.');
		lines.push('* All date/time are Unix timestamps in milliseconds.');
		lines.push('* Booleans are integer values 0 or 1.');
		lines.push('');

		lines.push('# Testing if the service is available');
		lines.push('');
		lines.push('Call **GET /ping** to check if the service is available. It should return "JoplinClipperServer" if it works.');
		lines.push('');

		lines.push('# Searching');
		lines.push('');
		lines.push('Call **GET /search?query=YOUR_QUERY** to search for notes. This end-point supports the `field` parameter which is recommended to use so that you only get the data that you need. The query syntax is as described in the main documentation: https://joplinapp.org/#searching');
		lines.push('');
		lines.push('To retrieve non-notes items, such as notebooks or tags, add a `type` parameter and set it to the required [item type name](#item-type-id). In that case, full text search will not be used - instead it will be a simple case-insensitive search. You can also use `*` as a wildcard. This is convenient for example to retrieve notebooks or tags by title.');
		lines.push('');
		lines.push('For example, to retrieve the notebook named `recipes`: **GET /search?query=recipes&type=folder**');
		lines.push('');
		lines.push('To retrieve all the tags that start with `project-`: **GET /search?query=project-*&type=tag**');
		lines.push('');

		lines.push('# Item type IDs');
		lines.push('');
		lines.push('Item type IDs might be refered to in certain object you will retrieve from the API. This is the correspondance between name and ID:');
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
				// tableFields.push({
				// 	name: 'tags',
				// 	type: Database.enumId('fieldType', 'text'),
				// 	description: 'Comma-separated list of tags. eg. `tag1,tag2`.',
				// });
			}

			lines.push(`# ${toTitleCase(tableName)}`);
			lines.push('');

			if (model.type === BaseModel.TYPE_FOLDER) {
				lines.push('This is actually a notebook. Internally notebooks are called "folders".');
				lines.push('');
			}

			lines.push('## Properties');
			lines.push('');
			lines.push(this.createPropertiesTable(tableFields));
			lines.push('');

			lines.push(`## GET /${tableName}`);
			lines.push('');
			lines.push(`Gets all ${tableName}`);
			lines.push('');

			if (model.type === BaseModel.TYPE_FOLDER) {
				lines.push('The folders are returned as a tree. The sub-notebooks of a notebook, if any, are under the `children` key.');
				lines.push('');
			}

			lines.push(`## GET /${tableName}/:id`);
			lines.push('');
			lines.push(`Gets ${singular} with ID :id`);
			lines.push('');

			if (model.type === BaseModel.TYPE_TAG) {
				lines.push('## GET /tags/:id/notes');
				lines.push('');
				lines.push('Gets all the notes with this tag.');
				lines.push('');
			}

			if (model.type === BaseModel.TYPE_NOTE) {
				lines.push('## GET /notes/:id/tags');
				lines.push('');
				lines.push('Gets all the tags attached to this note.');
				lines.push('');

				lines.push('## GET /notes/:id/resources');
				lines.push('');
				lines.push('Gets all the resources attached to this note.');
				lines.push('');
			}

			if (model.type === BaseModel.TYPE_FOLDER) {
				lines.push('## GET /folders/:id/notes');
				lines.push('');
				lines.push('Gets all the notes inside this folder.');
				lines.push('');
			}

			if (model.type === BaseModel.TYPE_RESOURCE) {
				lines.push('## GET /resources/:id/file');
				lines.push('');
				lines.push('Gets the actual file associated with this resource.');
				lines.push('');
			}

			lines.push(`## POST /${tableName}`);
			lines.push('');
			lines.push(`Creates a new ${singular}`);
			lines.push('');

			if (model.type === BaseModel.TYPE_RESOURCE) {
				lines.push('Creating a new resource is special because you also need to upload the file. Unlike other API calls, this one must have the "multipart/form-data" Content-Type. The file data must be passed to the "data" form field, and the other properties to the "props" form field. An example of a valid call with cURL would be:');
				lines.push('');
				lines.push('\tcurl -F \'data=@/path/to/file.jpg\' -F \'props={"title":"my resource title"}\' http://localhost:41184/resources');
				lines.push('');
				lines.push('The "data" field is required, while the "props" one is not. If not specified, default values will be used.');
				lines.push('');
			}

			if (model.type === BaseModel.TYPE_TAG) {
				lines.push('## POST /tags/:id/notes');
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
				lines.push('      curl --data \'{ "title": "My note", "body": "Some note in **Markdown**"}\' http://127.0.0.1:41184/notes');
				lines.push('');
				lines.push('* Create a note from some HTML');
				lines.push('');
				lines.push('      curl --data \'{ "title": "My note", "body_html": "Some note in <b>HTML</b>"}\' http://127.0.0.1:41184/notes');
				lines.push('');
				lines.push('* Create a note and attach an image to it:');
				lines.push('');
				lines.push('      curl --data \'{ "title": "Image test", "body": "Here is Joplin icon:", "image_data_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAANZJREFUeNoAyAA3/wFwtO3K6gUB/vz2+Prw9fj/+/r+/wBZKAAExOgF4/MC9ff+MRH6Ui4E+/0Bqc/zutj6AgT+/Pz7+vv7++nu82c4DlMqCvLs8goA/gL8/fz09fb59vXa6vzZ6vjT5fbn6voD/fwC8vX4UiT9Zi//APHyAP8ACgUBAPv5APz7BPj2+DIaC2o3E+3o6ywaC5fT6gD6/QD9/QEVf9kD+/dcLQgJA/7v8vqfwOf18wA1IAIEVycAyt//v9XvAPv7APz8LhoIAPz9Ri4OAgwARgx4W/6fVeEAAAAASUVORK5CYII="}\' http://127.0.0.1:41184/notes');
				lines.push('');
				lines.push('### Creating a note with a specific ID');
				lines.push('');
				lines.push('When a new note is created, it is automatically assigned a new unique ID so **normally you do not need to set the ID**. However, if for some reason you want to set it, you can supply it as the `id` property. It needs to be a 32 characters long hexadecimal string. **Make sure it is unique**, for example by generating it using whatever GUID function is available in your programming language.');
				lines.push('');
				lines.push('      curl --data \'{ "id": "00a87474082744c1a8515da6aa5792d2", "title": "My note with custom ID"}\' http://127.0.0.1:41184/notes');
				lines.push('');
			}

			lines.push(`## PUT /${tableName}/:id`);
			lines.push('');
			lines.push(`Sets the properties of the ${singular} with ID :id`);
			lines.push('');

			lines.push(`## DELETE /${tableName}/:id`);
			lines.push('');
			lines.push(`Deletes the ${singular} with ID :id`);
			lines.push('');

			if (model.type === BaseModel.TYPE_TAG) {
				lines.push('## DELETE /tags/:id/notes/:note_id');
				lines.push('');
				lines.push('Remove the tag from the note.');
				lines.push('');
			}
		}

		this.stdout(lines.join('\n'));
	}
}

module.exports = Command;
