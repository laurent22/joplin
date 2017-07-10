import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { Folder } from 'lib/models/folder.js';
import { Note } from 'lib/models/note.js';
import { autocompleteItems } from './autocomplete.js';

class Command extends BaseCommand {

	usage() {
		return 'cat <title>';
	}

	description() {
		return 'Displays the given item data.';
	}

	autocomplete() {
		return { data: autocompleteItems };
	}

	async action(args) {
		let title = args['title'];

		let item = null;
		if (!app().currentFolder()) {
			item = await Folder.loadByField('title', title);
		} else {
			item = await Note.loadFolderNoteByField(app().currentFolder().id, 'title', title);
		}

		if (!item) throw new Error(_('No item with title "%s" found.', title));

		let content = null;
		if (!app().currentFolder()) {
			content = await Folder.serialize(item);
		} else {
			content = await Note.serialize(item);
		}

		this.log(content);
	}

}

module.exports = Command;