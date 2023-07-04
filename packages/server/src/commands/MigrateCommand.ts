import { PositionalOptions, Options } from 'yargs';
import Logger from '@joplin/lib/Logger';
import { disconnectDb, migrateDown, migrateLatest, migrateList, migrateUnlock, migrateUp } from '../db';
import BaseCommand, { RunContext } from './BaseCommand';

const logger = Logger.create('MigrateCommand');

enum ArgvCommand {
	Up = 'up',
	Down = 'down',
	Latest = 'latest',
	List = 'list',
	Unlock = 'unlock',
}

interface Argv {
	command: ArgvCommand;
	disableTransactions?: boolean;
}

export default class MigrateCommand extends BaseCommand {

	public command() {
		return 'migrate <command>';
	}

	public description() {
		return 'execute a database migration';
	}

	public positionals(): Record<string, PositionalOptions> {
		return {
			'command': {
				description: 'command to execute',
				choices: [
					ArgvCommand.Up,
					ArgvCommand.Down,
					ArgvCommand.Latest,
					ArgvCommand.List,
					ArgvCommand.Unlock,
				],
			},
		};
	}

	public options(): Record<string, Options> {
		return {
			'disable-transactions': {
				type: 'boolean',
			},
		};
	}

	public async run(argv: Argv, runContext: RunContext): Promise<void> {
		// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
		const commands: Record<ArgvCommand, Function> = {
			up: async () => {
				await migrateUp(runContext.db, argv.disableTransactions);
			},
			down: async () => {
				await migrateDown(runContext.db, argv.disableTransactions);
			},
			latest: async () => {
				await migrateLatest(runContext.db, argv.disableTransactions);
			},
			list: async () => {
				const s = (await migrateList(runContext.db)) as string;
				// eslint-disable-next-line github/array-foreach -- Old code before rule was applied
				s.split('\n').forEach(l => logger.info(l));
			},
			unlock: async () => {
				await migrateUnlock(runContext.db);
			},
		};

		if (!commands[argv.command]) throw new Error(`Invalid command: ${argv.command}`);

		await commands[argv.command]();

		await disconnectDb(runContext.db);
	}

}
