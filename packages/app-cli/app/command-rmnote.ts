import BaseCommand from './base-command';
import app from './app';
import { _ } from '@joplin/lib/locale';
import Note from '@joplin/lib/models/Note';
import BaseModel, { DeleteOptions } from '@joplin/lib/BaseModel';
import { NoteEntity } from '@joplin/lib/services/database/types';

class Command extends BaseCommand {
	public override usage() {
		return 'rmnote <note-pattern>';
	}

	public override description() {
		return _('Deletes the notes matching <note-pattern>.');
	}

	public override options() {
		return [
			['-f, --force', _('Deletes the notes without asking for confirmation.')],
			['-p, --permanent', _('Deletes notes permanently, skipping the trash.')],
		];
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public override async action(args: any) {
		const pattern = args['note-pattern'];
		const force = args.options && args.options.force === true;

		const notes: NoteEntity[] = await app().loadItems(BaseModel.TYPE_NOTE, pattern);
		if (!notes.length) throw new Error(_('Cannot find "%s".', pattern));

		let ok = true;
		if (!force && notes.length > 1) {
			ok = await this.prompt(_('%d notes match this pattern. Delete them?', notes.length), { booleanAnswerDefault: 'n' });
		}

		const permanent = (args.options?.permanent === true) || notes.every(n => !!n.deleted_time);
		if (!force && permanent) {
			const message = (
				notes.length === 1 ? _('This will permanently delete the note "%s". Continue?', notes[0].title) : _('%d notes will be permanently deleted. Continue?', notes.length)
			);
			ok = await this.prompt(message, { booleanAnswerDefault: 'n' });
		}

		if (!ok) return;

		const ids = notes.map(n => n.id);
		const options: DeleteOptions = {
			toTrash: !permanent,
			sourceDescription: 'rmnote',
		};
		await Note.batchDelete(ids, options);
	}
}

module.exports = Command;
