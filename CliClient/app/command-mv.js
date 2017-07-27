import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { BaseModel } from 'lib/base-model.js';
import { Folder } from 'lib/models/folder.js';
import { Note } from 'lib/models/note.js';
import { autocompleteItems } from './autocomplete.js';

class Command extends BaseCommand {

	usage() {
		return _('mv <pattern> <destination>');
	}

	description() {
		return _('Moves the notes matching <pattern> to <destination>. If <pattern> is a note, it will be moved to the notebook <destination>. If <pattern> is a notebook, it will be renamed to <destination>.');
	}

	autocomplete() {
		return { data: autocompleteItems };
	}

	async action(args) {
		const pattern = args['pattern'];
		const destination = args['destination'];

		const item = await app().guessTypeAndLoadItem(pattern);

		if (!item) throw new Error(_('Cannot find "%s".', pattern));

		if (item.type_ == BaseModel.TYPE_FOLDER) {
			await Folder.save({ id: item.id, title: destination }, { userSideValidation: true });
			await app().refreshCurrentFolder();
		} else { // TYPE_NOTE
			const folder = await Folder.loadByField('title', destination);
			if (!folder) throw new Error(_('Cannot find "%s".', destination));

			const notes = await app().loadItems(BaseModel.TYPE_NOTE, pattern);
			if (!notes.length) throw new Error(_('Cannot find "%s".', pattern));

			for (let i = 0; i < notes.length; i++) {
				await Note.moveToFolder(notes[i].id, folder.id);
			}
		}
	}

}

module.exports = Command;