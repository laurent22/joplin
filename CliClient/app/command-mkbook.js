const { BaseCommand } = require('./base-command.js');
const { app } = require('./app.js');
const { _ } = require('lib/locale.js');
const Folder = require('lib/models/Folder.js');

class Command extends BaseCommand {
	usage() {
		return 'mkbook <new-notebook>';
	}

	description() {
		return _('Creates a new notebook.');
	}

	options() {
		return [
			['-s, --sub', _('Creates the new notebook as a sub-notebook of the currently selected notebook')],
		];
	}

	async action(args) {
		const options = args.options;

		const book = {
			title: args['new-notebook'],
		};

		if (options && options.sub) {
			if (!app().currentFolder()) throw new Error(_('Sub-notebooks can only be created within a notebook.'));
			book.parent_id = app().currentFolder().id;
		}

		const folder = await Folder.save(book, { userSideValidation: true });
		app().switchCurrentFolder(folder);
	}
}

module.exports = Command;
