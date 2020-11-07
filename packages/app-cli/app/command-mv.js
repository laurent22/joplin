const { BaseCommand } = require('./base-command.js');
const { app } = require('./app.js');
const { _ } = require('@joplin/lib/locale');
const BaseModel = require('@joplin/lib/BaseModel').default;
const Folder = require('@joplin/lib/models/Folder.js');
const Note = require('@joplin/lib/models/Note.js');

class Command extends BaseCommand {
	usage() {
		return 'mv <note> [notebook]';
	}

	description() {
		return _('Moves the notes matching <note> to [notebook].');
	}

	async action(args) {
		const pattern = args['note'];
		const destination = args['notebook'];

		const folder = await Folder.loadByField('title', destination);
		if (!folder) throw new Error(_('Cannot find "%s".', destination));

		const notes = await app().loadItems(BaseModel.TYPE_NOTE, pattern);
		if (!notes.length) throw new Error(_('Cannot find "%s".', pattern));

		for (let i = 0; i < notes.length; i++) {
			await Note.moveToFolder(notes[i].id, folder.id);
		}
	}
}

module.exports = Command;
