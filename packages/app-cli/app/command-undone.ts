import BaseCommand from './base-command';
import { _ } from '@joplin/lib/locale';

const CommandDone = require('./command-done.js');

class Command extends BaseCommand {
	public override usage() {
		return 'undone <note>';
	}

	public override description() {
		return _('Marks a to-do as non-completed.');
	}

	public override async action(args: { note: string }) {
		await CommandDone.handleAction(this, args, false);
	}
}

module.exports = Command;
