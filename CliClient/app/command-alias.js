import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { Setting } from 'lib/models/setting.js';

class Command extends BaseCommand {

	usage() {
		return 'alias <name> <command>';
	}

	description() {
		return 'Creates a new command alias which can then be used as a regular command (eg. `alias ll "ls -l"`)';
	}

	async action(args) {
		let aliases = Setting.value('aliases').trim();
		aliases = aliases.length ? JSON.parse(aliases) : [];
		aliases.push({
			name: args.name,
			command: args.command,
		});
		Setting.setValue('aliases', JSON.stringify(aliases));
	}

	enabled() {
		return false; // Doesn't work properly at the moment
	}

}

module.exports = Command;