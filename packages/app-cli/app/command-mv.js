const { BaseCommand } = require('./base-command.js');
const { app } = require('./app.js');
const { _ } = require('@joplin/lib/locale');
const BaseModel = require('@joplin/lib/BaseModel').default;
const Folder = require('@joplin/lib/models/Folder').default;
const Note = require('@joplin/lib/models/Note').default;

class Command extends BaseCommand {
	usage() {
		return 'mv <note_or_notebook> [notebook]';
	}

	description() {
		return _('Moves the notes matching <note_or_notebook> or single notebook to [notebook].');
	}

	async action(args) {
		const pattern = args['note_or_notebook'];
		const destination = args['notebook'];

		// TODO: allow partial ids
		let folder = await Folder.loadByField('id', destination);
		if (!folder) {
			folder = await Folder.loadByField('title', destination);
			if (!folder) throw new Error(_('Cannot find "%s".', destination));
		}

		let srcFolder = await Folder.loadByField('id', pattern);
		if (!srcFolder) {
			srcFolder = await Folder.loadByField('title', pattern);
		}
		if (srcFolder) {
			// ../../lib/models/Folder.ts
			// moveToFolder(folderId: string, targetFolderId: string)
			await Folder.moveToFolder(srcFolder.id, folder.id);
		} else {
			const notes = await app().loadItems(BaseModel.TYPE_NOTE, pattern);
			if (!notes.length) throw new Error(_('Cannot find "%s".', pattern));
			for (let i = 0; i < notes.length; i++) {
				await Note.moveToFolder(notes[i].id, folder.id);
			}
		}
	}
}

module.exports = Command;
