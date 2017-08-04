import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { BaseItem } from 'lib/models/base-item.js';
import { Folder } from 'lib/models/folder.js';
import { Note } from 'lib/models/note.js';
import { BaseModel } from 'lib/base-model.js';
import { autocompleteItems } from './autocomplete.js';
import { cliUtils } from './cli-utils.js';

class Command extends BaseCommand {

	usage() {
		return 'rm <note-pattern>';
	}

	description() {
		return _('Deletes the notes matching <note-pattern>.');
	}

	autocomplete() {
		return { data: autocompleteItems };
	}

	options() {
		return [
			['-f, --force', _('Deletes the items without asking for confirmation.')],
		];
	}

	async action(args) {
		const pattern = args['note-pattern'];
		const recursive = args.options && args.options.recursive === true;
		const force = args.options && args.options.force === true;

		// if (recursive) {
		// 	const folder = await app().loadItem(BaseModel.TYPE_FOLDER, pattern);
		// 	if (!folder) throw new Error(_('Cannot find "%s".', pattern));
		// 	//const ok = force ? true : await vorpalUtils.cmdPromptConfirm(this, _('Delete notebook "%s"?', folder.title));
		// 	if (!ok) return;
		// 	await Folder.delete(folder.id);
		// 	await app().refreshCurrentFolder();
		// } else {

		const notes = await app().loadItems(BaseModel.TYPE_NOTE, pattern);
		if (!notes.length) throw new Error(_('Cannot find "%s".', pattern));
		const ok = force ? true : await cliUtils.promptConfirm(_('%d notes match this pattern. Delete them?', notes.length));
		if (!ok) return;
		let ids = notes.map((n) => n.id);
		await Note.batchDelete(ids);
	}

}

module.exports = Command;