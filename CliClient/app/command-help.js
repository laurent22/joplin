import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { renderCommandHelp } from './help-utils.js';
import { Database } from 'lib/database.js';
import { Setting } from 'lib/models/setting.js';
import { _ } from 'lib/locale.js';
import { ReportService } from 'lib/services/report.js';

class Command extends BaseCommand {

	usage() {
		return 'help [command]';
	}

	description() {
		return _('Displays usage information.');
	}

	async action(args) {
		const commands = args['command'] ? [app().findCommandByName(args['command'])] : app().commands();

		let output = [];
		for (let n in commands) {
			if (!commands.hasOwnProperty(n)) continue;
			const command = commands[n];
			output.push(renderCommandHelp(command));
		}

		output.sort();

		this.stdout(output.join("\n\n"));
	}

}

module.exports = Command;