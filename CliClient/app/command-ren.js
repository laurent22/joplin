const { BaseCommand } = require('./base-command.js');
const { app } = require('./app.js');
const { _ } = require('lib/locale.js');
const BaseModel = require('lib/BaseModel.js');
const Folder = require('lib/models/Folder.js');
const Note = require('lib/models/Note.js');

class Command extends BaseCommand {
	usage() {
		return 'ren <item> <name>';
	}

	description() {
		return _('Renames the given <item> (note or notebook) to <name>.');
	}

	async action(args) {
		const pattern = args['item'];
		const name = args['name'];

		const item = await app().loadItem('folderOrNote', pattern);
		this.encryptionCheck(item);
		if (!item) throw new Error(_('Cannot find "%s".', pattern));

		const newItem = {
			id: item.id,
			title: name,
			type_: item.type_,
		};

		if (item.type_ === BaseModel.TYPE_FOLDER) {
			await Folder.save(newItem);
		} else {
			await Note.save(newItem);
		}
	}
}

module.exports = Command;
