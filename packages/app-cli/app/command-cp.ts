import BaseCommand from './base-command';
import app from './app';
import { _ } from '@joplin/lib/locale';
import BaseModel from '@joplin/lib/BaseModel';
import Note from '@joplin/lib/models/Note';

class Command extends BaseCommand {
	public override usage() {
		return 'cp <note> [notebook]';
	}

	public override description() {
		return _('Duplicates the notes matching <note> to [notebook]. If no notebook is specified the note is duplicated in the current notebook.');
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public override async action(args: any) {
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
			void Note.updateGeolocation(newNote.id);
		}
	}
}

module.exports = Command;
