import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { BaseModel } from 'lib/base-model.js';
import { Folder } from 'lib/models/folder.js';
import { Note } from 'lib/models/note.js';
import { autocompleteItems } from './autocomplete.js';

class Command extends BaseCommand {

	usage() {
		return 'cp <pattern> [notebook]';
	}

	description() {
		return 'Duplicates the notes matching <pattern> to [notebook]. If no notebook is specified the note is duplicated in the current notebook.';
	}

	autocomplete() {
		return { data: autocompleteItems };
	}

	async action(args) {
		let folder = null;
		if (args['notebook']) {
			folder = await app().loadItem(BaseModel.TYPE_FOLDER, args['notebook']);
		} else {
			folder = app().currentFolder();
		}

		if (!folder) throw new Error(_('No notebook "%s"', args['notebook']));

		const notes = await app().loadItems(BaseModel.TYPE_NOTE, args['pattern']);
		if (!notes.length) throw new Error(_('No note matches this pattern: "%s"', args['pattern']));

		for (let i = 0; i < notes.length; i++) {
			const newNote = await Note.duplicate(notes[i].id, {
				changes: {
					parent_id: folder.id
				},
			});
			Note.updateGeolocation(newNote.id);
		}
	}

}

module.exports = Command;