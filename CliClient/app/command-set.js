import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { BaseModel } from 'lib/base-model.js';
import { Folder } from 'lib/models/folder.js';
import { Note } from 'lib/models/note.js';
import { BaseItem } from 'lib/models/base-item.js';
import { autocompleteItems } from './autocomplete.js';

class Command extends BaseCommand {

	usage() {
		return _('set <note> <name> [value]');
	}

	description() {
		return _('Sets the property <name> of the given <note> to the given [value].');
	}

	autocomplete() {
		return { data: autocompleteItems };
	}

	async action(args) {
		let title = args['note'];
		let propName = args['name'];
		let propValue = args['value'];
		if (!propValue) propValue = '';

		let notes = await app().loadItems(BaseModel.TYPE_NOTE, title);
		if (!notes.length) throw new Error(_('Cannot find "%s".', title));

		for (let i = 0; i < notes.length; i++) {
			let newNote = {
				id: notes[i].id,
				type_: notes[i].type_,
			};
			newNote[propName] = propValue;
			await Note.save(newNote);
		}
	}

}

module.exports = Command;