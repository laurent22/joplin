import BaseCommand from './base-command';
import app from './app';
import { _ } from '@joplin/lib/locale';

class Command extends BaseCommand {
	public override usage() {
		return 'clear';
	}

	public override description() {
		return _('Clears the console output.');
	}

	public override async action() {
		app().gui().widget('console').clear();
	}
}

module.exports = Command;
