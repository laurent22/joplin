import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { BaseModel } from 'lib/base-model.js';
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

	options() {
		return [
			['-v, --verbose', 'Shows complete information about note.'],
		];
	}

	autocomplete() {
		return { data: autocompleteItems };
	}

	async action(args) {
		let title = args['title'];

		let item = await app().loadItem(BaseModel.TYPE_NOTE, title);
		if (!item) throw new Error(_('No item "%s" found.', title));

		const content = args.options.verbose ? await Note.serialize(item) : await Note.serializeForEdit(item);
		this.log(content);
	}

}

module.exports = Command;