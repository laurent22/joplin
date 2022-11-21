const BaseCommand = require('./base-command').default;
const { _ } = require('@joplin/lib/locale');

class Command extends BaseCommand {
	usage() {
		return 'batch <file-path>';
	}

	description() {
		return _('Runs the commands contained in the text file. There should be one command per line.');
	}

	async action() {
		// Implementation is in app.js::commandList()
		throw new Error('No implemented');
	}
}

module.exports = Command;
