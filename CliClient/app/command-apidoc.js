const { BaseCommand } = require('./base-command.js');
const { _ } = require('lib/locale.js');
const { cliUtils } = require('./cli-utils.js');
const EncryptionService = require('lib/services/EncryptionService');
const DecryptionWorker = require('lib/services/DecryptionWorker');
const MasterKey = require('lib/models/MasterKey');
const BaseItem = require('lib/models/BaseItem');
const BaseModel = require('lib/BaseModel');
const Setting = require('lib/models/Setting.js');
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
  			{ name: 'type', label: 'Type', filter: (value) => {
  				return Database.enumName('fieldType', value);
  			}},
  			{ name: 'description', label: 'Description' },
  		];
		
		return markdownUtils.createMarkdownTable(headers, tableFields); 
	}

	async action(args) {
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

		// Get list of note tags
		// Get list of folder notes

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

		lines.push('# Authorisation')
		lines.push('');
		lines.push('To prevent unauthorised applications from accessing the API, the calls must be authentified. To do so, you must provide a token as a query parameter for each API call. You can get this token from the Joplin desktop application, on the Web Clipper Options screen.');
		lines.push('');
		lines.push('This would be an example of valid cURL call using a token:');
		lines.push('');
		lines.push('\tcurl http://localhost:41184/notes?token=ABCD123ABCD123ABCD123ABCD123ABCD123');
		lines.push('');
		lines.push('In the documentation below, the token will not be specified every time however you will need to include it.');

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
		lines.push('* **POST**: To create new items.');
		lines.push('* **PUT**: To update an item. Note in a REST API, traditionally PUT is used to completely replace an item, however in this API it will only replace the properties that are provided. For example if you PUT {"title": "my new title"}, only the "title" property will be changed. The other properties will be left untouched (they won\'t be cleared nor changed).');
		lines.push('* **DELETE**: To delete items.');
		lines.push('');

		lines.push('# About the property types');
		lines.push('');
		lines.push('* Text is UTF-8.');
		lines.push('* All date/time are Unix timestamps in milliseconds.');
		lines.push('* Booleans are integer values 0 or 1.');
		lines.push('');

		for (let i = 0; i < models.length; i++) {
			const model = models[i];
			const ModelClass = BaseItem.getClassByItemType(model.type);
			const tableName = ModelClass.tableName();
			const tableFields = reg.db().tableFields(tableName, { includeDescription: true });
			const singular = tableName.substr(0, tableName.length - 1);

			lines.push('# ' + toTitleCase(tableName));
			lines.push('');

			if (model.type === BaseModel.TYPE_FOLDER) {
				lines.push('This is actually a notebook. Internally notebooks are called "folders".');
				lines.push('');
			}

			lines.push('## Properties');
			lines.push('');
			lines.push(this.createPropertiesTable(tableFields));
			lines.push('');

			lines.push('## GET /' + tableName);
			lines.push('');
			lines.push('Gets all ' + tableName);
			lines.push('');

			lines.push('## GET /' + tableName + '/:id');
			lines.push('');
			lines.push('Gets ' + singular + ' with ID :id');
			lines.push('');

			if (model.type === BaseModel.TYPE_TAG) {
				lines.push('## GET /tags/:id/notes');
				lines.push('');
				lines.push('Get all the notes with this tag.');
				lines.push('');
			}

			lines.push('## POST /' + tableName);
			lines.push('');
			lines.push('Creates a new ' + singular);
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

			lines.push('## PUT /' + tableName + '/:id');
			lines.push('');
			lines.push('Sets the properties of the ' + singular + ' with ID :id');
			lines.push('');

			lines.push('## DELETE /' + tableName + '/:id');
			lines.push('');
			lines.push('Deletes the ' + singular + ' with ID :id');
			lines.push('');

			if (model.type === BaseModel.TYPE_TAG) {
				lines.push('## DELETE /tags/:id/notes/:note_id');
				lines.push('');
				lines.push('Remove the tag from the note..');
				lines.push('');
			}
		}

		this.stdout(lines.join('\n'));
	}

}

module.exports = Command;
