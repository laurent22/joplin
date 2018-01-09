const { BaseCommand } = require('./base-command.js');
const { app } = require('./app.js');
const { _ } = require('lib/locale.js');
const Folder = require('lib/models/Folder.js');
const { reg } = require('lib/registry.js');

class Command extends BaseCommand {

	usage() {
		return 'mkbook <new-notebook>';
	}

	description() {
		return _('Creates a new notebook.');
	}

	aliases() {
		return ['mkdir'];
	}

	async action(args) {
		let folder = await Folder.save({ title: args['new-notebook'] }, { userSideValidation: true });		
		app().switchCurrentFolder(folder);
	}

}

module.exports = Command;