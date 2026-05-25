

import BaseCommand from './base-command';
import { _ } from '@joplin/lib/locale';
import { handleAction } from './command-done.js';
class Command extends BaseCommand {
	usage() {
		return 'undone <note>';
	}

	description() {
		return _('Marks a to-do as non-completed.');
	}

	async action(args) {
		await handleAction(this, args, false);
	}
}

export default Command;
