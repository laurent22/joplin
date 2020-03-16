const { BaseCommand } = require('./base-command.js');
const { app } = require('./app.js');
const { renderCommandHelp } = require('./help-utils.js');
const { _ } = require('lib/locale.js');
const { cliUtils } = require('./cli-utils.js');

class Command extends BaseCommand {
	usage() {
		return 'help [command]';
	}

	description() {
		return _('Displays usage information.');
	}

	allCommands() {
		const commands = app().commands(app().uiType());
		const output = [];
		for (const n in commands) {
			if (!commands.hasOwnProperty(n)) continue;
			const command = commands[n];
			if (command.hidden()) continue;
			if (!command.enabled()) continue;
			output.push(command);
		}

		output.sort((a, b) => (a.name() < b.name() ? -1 : +1));

		return output;
	}

	async action(args) {
		const stdoutWidth = app().commandStdoutMaxWidth();

		if (args.command === 'shortcuts' || args.command === 'keymap') {
			this.stdout(_('For information on how to customise the shortcuts please visit %s', 'https://joplinapp.org/terminal/#shortcuts'));
			this.stdout('');

			if (
				app()
					.gui()
					.isDummy()
			) {
				throw new Error(_('Shortcuts are not available in CLI mode.'));
			}

			const keymap = app()
				.gui()
				.keymap();

			const rows = [];

			for (let i = 0; i < keymap.length; i++) {
				const item = keymap[i];
				const keys = item.keys.map(k => (k === ' ' ? '(SPACE)' : k));
				rows.push([keys.join(', '), item.command]);
			}

			cliUtils.printArray(this.stdout.bind(this), rows);
		} else if (args.command === 'all') {
			const commands = this.allCommands();
			const output = commands.map(c => renderCommandHelp(c));
			this.stdout(output.join('\n\n'));
		} else if (args.command) {
			const command = app().findCommandByName(args['command']);
			if (!command) throw new Error(_('Cannot find "%s".', args.command));
			this.stdout(renderCommandHelp(command, stdoutWidth));
		} else {
			const commandNames = this.allCommands().map(a => a.name());

			this.stdout(_('Type `help [command]` for more information about a command; or type `help all` for the complete usage information.'));
			this.stdout('');
			this.stdout(_('The possible commands are:'));
			this.stdout('');
			this.stdout(commandNames.join(', '));
			this.stdout('');
			this.stdout(_('In any command, a note or notebook can be referred to by title or ID, or using the shortcuts `$n` or `$b` for, respectively, the currently selected note or notebook. `$c` can be used to refer to the currently selected item.'));
			this.stdout('');
			this.stdout(_('To move from one pane to another, press Tab or Shift+Tab.'));
			this.stdout(_('Use the arrows and page up/down to scroll the lists and text areas (including this console).'));
			this.stdout(_('To maximise/minimise the console, press "tc".'));
			this.stdout(_('To enter command line mode, press ":"'));
			this.stdout(_('To exit command line mode, press ESCAPE'));
			this.stdout(_('For the list of keyboard shortcuts and config options, type `help keymap`'));
		}

		app()
			.gui()
			.showConsole();
		app()
			.gui()
			.maximizeConsole();
	}
}

module.exports = Command;
