import yargs = require('yargs');
import BaseCommand from '../commands/BaseCommand';
import DbCommand from '../commands/DbCommand';
import CompressOldChangesCommand from '../commands/CompressOldChangesCommand';
import StorageCommand from '../commands/StorageCommand';
import MigrateCommand from '../commands/MigrateCommand';

export interface Commands {
	commands: BaseCommand[];
	argv: typeof yargs.argv;
	selectedCommand: BaseCommand;
	yargs: typeof yargs;
}

export default async function setupCommands(): Promise<Commands> {
	const commands: BaseCommand[] = [
		new MigrateCommand(),
		new DbCommand(),
		new CompressOldChangesCommand(),
		new StorageCommand(),
	];

	for (const cmd of commands) {
		yargs.command(cmd.command(), cmd.description(), (yargs) => {
			const positionals = cmd.positionals ? cmd.positionals() : {};

			for (const [name, options] of Object.entries(positionals)) {
				yargs.positional(name, options ? options : {});
			}

			const commandOptions = cmd.options() ? cmd.options() : {};
			for (const [name, options] of Object.entries(commandOptions)) {
				yargs.options(name, options);
			}
		});
	}

	// yargs.option('env', {
	// 	default: 'prod',
	// 	type: 'string',
	// 	choices: ['dev', 'prod'],
	// 	hidden: true,
	// });

	// yargs.option('stack-trace', {
	// 	default: '1',
	// 	type: 'boolean',
	// 	hidden: true,
	// });

	// yargs.option('db-config-filename', {
	// 	type: 'string',
	// 	hidden: true,
	// });

	yargs.help();

	const argv = await yargs.argv;

	const cmdName = argv._ && argv._.length ? argv._[0] : null;
	let selectedCommand = null;

	for (const cmd of commands) {
		if (cmd.commandName() === cmdName) selectedCommand = cmd;
	}

	if (cmdName && !selectedCommand) {
		yargs.showHelp();
		// eslint-disable-next-line no-console
		console.info('');
		throw new Error(`Invalid command: ${cmdName}`);
	}

	return {
		commands,
		argv,
		selectedCommand,
		yargs,
	};
}
