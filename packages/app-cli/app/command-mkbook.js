const BaseCommand = require('./base-command').default;
const { app } = require('./app.js');
const { _ } = require('@joplin/lib/locale');
const Folder = require('@joplin/lib/models/Folder').default;

class Command extends BaseCommand {
	usage() {
		return 'mkbook <new-notebook>';
	}

	description() {
		return _('Creates a new notebook.');
	}

	async action(args) {
		const folder = await Folder.save({ title: args['new-notebook'] }, { userSideValidation: true });
		app().switchCurrentFolder(folder);
	}
}

module.exports = Command;
