import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { Folder } from 'lib/models/folder.js';
import { reg } from 'lib/registry.js';

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