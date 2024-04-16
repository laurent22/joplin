import BaseCommand from './base-command';
import app from './app';
import { _ } from '@joplin/lib/locale';
import BaseModel from '@joplin/lib/BaseModel';
import Database from '@joplin/lib/database';
import Note from '@joplin/lib/models/Note';

class Command extends BaseCommand {
	public override usage() {
		return 'set <note> <name> [value]';
	}

	public override description() {
		const fields = Note.fields();
		const s = [];
		for (let i = 0; i < fields.length; i++) {
			const f = fields[i];
			if (f.name === 'id') continue;
			s.push(`${f.name} (${Database.enumName('fieldType', f.type)})`);
		}

		return _('Sets the property <name> of the given <note> to the given [value]. Possible properties are:\n\n%s', s.join(', '));
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public override async action(args: any) {
		const title = args['note'];
		const propName = args['name'];
		let propValue = args['value'];
		if (!propValue) propValue = '';

		const notes = await app().loadItems(BaseModel.TYPE_NOTE, title);
		if (!notes.length) throw new Error(_('Cannot find "%s".', title));

		for (let i = 0; i < notes.length; i++) {
			this.encryptionCheck(notes[i]);

			const timestamp = Date.now();

			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			const newNote: any = {
				id: notes[i].id,
				type_: notes[i].type_,
				updated_time: timestamp,
			};
			newNote[propName] = propValue;

			if (!newNote.id) newNote.created_time = timestamp;

			await Note.save(newNote, {
				autoTimestamp: false, // No auto-timestamp because user may have provided them
			});
		}
	}
}

module.exports = Command;
