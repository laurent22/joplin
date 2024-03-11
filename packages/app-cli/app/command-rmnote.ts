import BaseCommand from './base-command';
import app from './app';
import { _ } from '@joplin/lib/locale';
import Note from '@joplin/lib/models/Note';
import BaseModel from '@joplin/lib/BaseModel';
import { NoteEntity } from '@joplin/lib/services/database/types';

class Command extends BaseCommand {
	public override usage() {
		return 'rmnote <note-pattern>';
	}

	public override description() {
		return _('Deletes the notes matching <note-pattern>.');
	}

	public override options() {
		return [['-f, --force', _('Deletes the notes without asking for confirmation.')]];
	}

	public override async action(args: any) {
		const pattern = args['note-pattern'];
		const force = args.options && args.options.force === true;

		const notes: NoteEntity[] = await app().loadItems(BaseModel.TYPE_NOTE, pattern);
		if (!notes.length) throw new Error(_('Cannot find "%s".', pattern));

		let ok = true;
		if (!force && notes.length > 1) {
			ok = await this.prompt(_('%d notes match this pattern. Delete them?', notes.length), { booleanAnswerDefault: 'n' });
		}

		if (!ok) return;

		const ids = notes.map(n => n.id);
		await Note.batchDelete(ids, { toTrash: true, sourceDescription: 'rmnote command' });
	}
}

module.exports = Command;
