
import BaseCommand from './base-command';
import app from './app';
import { _ } from '@joplin/lib/locale';
import Note from '@joplin/lib/models/Note';
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

export default Command;
