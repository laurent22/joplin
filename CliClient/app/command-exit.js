const { BaseCommand } = require('./base-command.js');
const { app } = require('./app.js');
const { _ } = require('lib/locale.js');

class Command extends BaseCommand {
	usage() {
		return 'exit';
	}

	description() {
		return _('Exits the application.');
	}

	compatibleUis() {
		return ['gui'];
	}

	async action() {
		await app().exit();
	}
}

module.exports = Command;
