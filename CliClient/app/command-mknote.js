import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { Note } from 'lib/models/note.js';

class Command extends BaseCommand {

	usage() {
		return 'mknote <note>';
	}

	description() {
		return 'Creates a new note.';
	}

	aliases() {
		return ['touch'];
	}

	async action(args) {
		if (!app().currentFolder()) throw new Error(_('Notes can only be created within a notebook.'));

		let path = await app().parseNotePattern(args['note']);

		let note = {
			title: path.title,
			parent_id: path.parent ? path.parent.id : app().currentFolder().id,
		};

		note = await Note.save(note);
		Note.updateGeolocation(note.id);
	}

}

module.exports = Command;