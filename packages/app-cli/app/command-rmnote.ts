import BaseCommand from './base-command';
const { app } = require('./app.js');
import { _ } from '@joplin/lib/locale';
import Note from '@joplin/lib/models/Note';
import BaseModel from '@joplin/lib/BaseModel';

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

		const notes = await app().loadItems(BaseModel.TYPE_NOTE, pattern);
		if (!notes.length) throw new Error(_('Cannot find "%s".', pattern));

		const ok = force ? true : await this.prompt(notes.length > 1 ? _('%d notes match this pattern. Delete them?', notes.length) : _('Delete note?'), { booleanAnswerDefault: 'n' });
		if (!ok) return;
		const ids = notes.map((n: any) => n.id);
		await Note.batchDelete(ids);
	}
}

module.exports = Command;
