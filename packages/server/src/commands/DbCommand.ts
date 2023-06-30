import { PositionalOptions } from 'yargs';
import config from '../config';
import { connectDb, disconnectDb, dropTables } from '../db';
import BaseCommand from './BaseCommand';
import { createDb } from '../tools/dbTools';

enum ArgvCommand {
	DropTables = 'dropTables',
	Create = 'create',
}

interface Argv {
	command: ArgvCommand;
}

export default class DbCommand extends BaseCommand {

	public command() {
		return 'db <command>';
	}

	public description() {
		return 'execute a database command';
	}

	public positionals(): Record<string, PositionalOptions> {
		return {
			'command': {
				description: 'command to execute',
				choices: [
					ArgvCommand.Create,
					ArgvCommand.DropTables,
				],
			},
		};
	}

	public async run(argv: Argv): Promise<void> {


		// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
		const commands: Record<ArgvCommand, Function> = {
			create: async () => {
				await createDb(config().database);
			},
			dropTables: async () => {
				const db = await connectDb(config().database);
				await dropTables(db);
				await disconnectDb(db);
			},
		};

		if (!commands[argv.command]) throw new Error(`Invalid command: ${argv.command}`);

		await commands[argv.command]();
	}

}
