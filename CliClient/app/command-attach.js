const { BaseCommand } = require('./base-command.js');
const { app } = require('./app.js');
const { _ } = require('lib/locale.js');
const BaseModel = require('lib/BaseModel.js');
const { shim } = require('lib/shim.js');

class Command extends BaseCommand {
	usage() {
		return 'attach <note> <file>';
	}

	description() {
		return _('Attaches the given file to the note.');
	}

	async action(args) {
		const title = args['note'];

		const note = await app().loadItem(BaseModel.TYPE_NOTE, title, { parent: app().currentFolder() });
		this.encryptionCheck(note);
		if (!note) throw new Error(_('Cannot find "%s".', title));

		const localFilePath = args['file'];

		await shim.attachFileToNote(note, localFilePath);
	}
}

module.exports = Command;
