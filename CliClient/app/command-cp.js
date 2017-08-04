import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { BaseModel } from 'lib/base-model.js';
import { Folder } from 'lib/models/folder.js';
import { Note } from 'lib/models/note.js';
import { autocompleteItems } from './autocomplete.js';

class Command extends BaseCommand {

	usage() {
		return 'cp <note> [notebook]';
	}

	description() {
		return _('Duplicates the notes matching <note> to [notebook]. If no notebook is specified the note is duplicated in the current notebook.');
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

		if (!folder) throw new Error(_('Cannot find "%s".', args['notebook']));

		const notes = await app().loadItems(BaseModel.TYPE_NOTE, args['note']);
		if (!notes.length) throw new Error(_('Cannot find "%s".', args['note']));

		for (let i = 0; i < notes.length; i++) {
			const newNote = await Note.copyToFolder(notes[i].id, folder.id);
			Note.updateGeolocation(newNote.id);
		}
	}

}

module.exports = Command;