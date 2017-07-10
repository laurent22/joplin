import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { Folder } from 'lib/models/folder.js';
import { Note } from 'lib/models/note.js';
import { autocompleteItems } from './autocomplete.js';

class Command extends BaseCommand {

	usage() {
		return 'mv <pattern> <notebook>';
	}

	description() {
		return 'Moves the notes matching <pattern> to <notebook>.';
	}

	autocomplete() {
		return { data: autocompleteItems };
	}

	async action(args) {
		if (!app().currentFolder()) throw new Error(_('Please select a notebook first.'));

		let pattern = args['pattern'];

		let folder = await Folder.loadByField('title', args['notebook']);
		if (!folder) throw new Error(_('No folder with title "%s"', args['notebook']));
		let notes = await Note.previews(app().currentFolder().id, { titlePattern: pattern });
		if (!notes.length) throw new Error(_('No note matches this pattern: "%s"', pattern));

		for (let i = 0; i < notes.length; i++) {
			await Note.save({ id: notes[i].id, parent_id: folder.id });
		}
	}

}

module.exports = Command;