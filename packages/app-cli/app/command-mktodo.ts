import BaseCommand from './base-command';
import app from './app';
import { _ } from '@joplin/lib/locale';
import Note from '@joplin/lib/models/Note';
import { NoteEntity } from '@joplin/lib/services/database/types';

class Command extends BaseCommand {
	public override usage() {
		return 'mktodo <new-todo>';
	}

	public override description() {
		return _('Creates a new to-do.');
	}

	public override async action(args: { 'new-todo': string }) {
		if (!app().currentFolder()) throw new Error(_('Notes can only be created within a notebook.'));

		let note: NoteEntity = {
			title: args['new-todo'],
			parent_id: app().currentFolder().id,
			is_todo: 1,
		};

		note = await Note.save(note);
		void Note.updateGeolocation(note.id);

		app().switchCurrentFolder(app().currentFolder());
	}
}

module.exports = Command;
