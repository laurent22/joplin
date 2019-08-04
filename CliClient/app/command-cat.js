const { BaseCommand } = require('./base-command.js');
const { app } = require('./app.js');
const { _ } = require('lib/locale.js');
const BaseModel = require('lib/BaseModel.js');
const Note = require('lib/models/Note.js');

class Command extends BaseCommand {
	usage() {
		return 'cat <note>';
	}

	description() {
		return _('Displays the given note.');
	}

	options() {
		return [['-v, --verbose', _('Displays the complete information about note.')]];
	}

	async action(args) {
		let title = args['note'];

		let item = await app().loadItem(BaseModel.TYPE_NOTE, title, { parent: app().currentFolder() });
		if (!item) throw new Error(_('Cannot find "%s".', title));

		const content = args.options.verbose ? await Note.serialize(item) : await Note.serializeForEdit(item);
		this.stdout(content);

		app()
			.gui()
			.showConsole();
		app()
			.gui()
			.maximizeConsole();
	}
}

module.exports = Command;
