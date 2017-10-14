import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';

class Command extends BaseCommand {

	usage() {
		return 'exit';
	}

	description() {
		return _('Exits the application.');
	}

	async action(args) {
		await app().exit();
	}

}

module.exports = Command;