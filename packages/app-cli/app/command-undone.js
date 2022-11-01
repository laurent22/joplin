const BaseCommand = require('./base-command').default;
const { _ } = require('@joplin/lib/locale');

const CommandDone = require('./command-done.js');

class Command extends BaseCommand {
	usage() {
		return 'undone <note>';
	}

	description() {
		return _('Marks a to-do as non-completed.');
	}

	async action(args) {
		await CommandDone.handleAction(this, args, false);
	}
}

module.exports = Command;
