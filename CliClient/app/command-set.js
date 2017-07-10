import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { Folder } from 'lib/models/folder.js';
import { Note } from 'lib/models/note.js';
import { BaseItem } from 'lib/models/base-item.js';
import { autocompleteItems } from './autocomplete.js';

class Command extends BaseCommand {

	usage() {
		return 'set <item> <name> [value]';
	}

	description() {
		return 'Sets the property <name> of the given <item> to the given [value].';
	}

	autocomplete() {
		return { data: autocompleteItems };
	}

	async action(args) {
		let title = args['item'];
		let propName = args['name'];
		let propValue = args['value'];
		if (!propValue) propValue = '';

		let item = null;
		if (!app().currentFolder()) {
			item = await Folder.loadByField('title', title);
		} else {
			item = await Note.loadFolderNoteByField(app().currentFolder().id, 'title', title);
		}

		if (!item) {
			item = await BaseItem.loadItemById(title);
		}

		if (!item) throw new Error(_('No item with title "%s" found.', title));

		let newItem = {
			id: item.id,
			type_: item.type_,
		};
		newItem[propName] = propValue;
		let ItemClass = BaseItem.itemClass(newItem);
		await ItemClass.save(newItem);
	}

}

module.exports = Command;