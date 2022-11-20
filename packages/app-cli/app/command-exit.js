const BaseCommand = require('./base-command').default;
const { app } = require('./app.js');
const { _ } = require('@joplin/lib/locale');

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
