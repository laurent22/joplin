import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { BaseItem } from 'lib/models/base-item.js';
import { Folder } from 'lib/models/folder.js';
import { Note } from 'lib/models/note.js';
import { BaseModel } from 'lib/base-model.js';
import { cliUtils } from './cli-utils.js';

class Command extends BaseCommand {

	usage() {
		return 'rmnote <note-pattern>';
	}

	description() {
		return _('Deletes the notes matching <note-pattern>.');
	}

	options() {
		return [
			['-f, --force', _('Deletes the notes without asking for confirmation.')],
		];
	}

	async action(args) {
		const pattern = args['note-pattern'];
		const force = args.options && args.options.force === true;

		const notes = await app().loadItems(BaseModel.TYPE_NOTE, pattern);
		if (!notes.length) throw new Error(_('Cannot find "%s".', pattern));

		const ok = force ? true : await this.prompt(notes.length > 1 ? _('%d notes match this pattern. Delete them?', notes.length) : _('Delete note?'), { booleanAnswerDefault: 'n' });
		if (!ok) return;
		let ids = notes.map((n) => n.id);
		await Note.batchDelete(ids);
	}

}

module.exports = Command;