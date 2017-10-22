import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { Note } from 'lib/models/note.js';

class Command extends BaseCommand {

	usage() {
		return 'mknote <new-note>';
	}

	description() {
		return _('Creates a new note.');
	}

	async action(args) {
		if (!app().currentFolder()) throw new Error(_('Notes can only be created within a notebook.'));

		let note = {
			title: args['new-note'],
			parent_id: app().currentFolder().id,
		};

		note = await Note.save(note);
		Note.updateGeolocation(note.id);

		app().switchCurrentFolder(app().currentFolder());
	}

}

module.exports = Command;