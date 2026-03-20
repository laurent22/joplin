import BaseCommand from './base-command';
import app from './app';

class Command extends BaseCommand {
	public override usage() {
		return 'clear';
	}

	public override description() {
		return ('Clears the console output.');
	}

	public override async action() {
		app().gui().widget('console').clear();
	}
}

module.exports = Command;
