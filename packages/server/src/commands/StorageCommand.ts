import { PositionalOptions, Options } from 'yargs';
import Logger from '@joplin/lib/Logger';
import BaseCommand, { RunContext } from './BaseCommand';
import parseStorageConnectionString from '../models/items/storage/parseStorageConnectionString';
import storageConnectionCheck from '../utils/storageConnectionCheck';

const logger = Logger.create('ImportContentCommand');

enum ArgvCommand {
	Import = 'import',
	CheckConnection = 'check-connection',
}

interface Argv {
	command: ArgvCommand;
	connection: string;
	batchSize?: number;
}

export default class StorageCommand extends BaseCommand {

	public command() {
		return 'storage <command>';
	}

	public description() {
		return 'import content to storage';
	}

	public positionals(): Record<string, PositionalOptions> {
		return {
			'command': {
				description: 'command to execute',
				choices: [
					ArgvCommand.Import,
					ArgvCommand.CheckConnection,
				],
			},
		};
	}

	public options(): Record<string, Options> {
		return {
			'batch-size': {
				type: 'number',
				description: 'Item batch size',
			},
			'connection': {
				description: 'storage connection string',
				type: 'string',
			},
		};
	}

	public async run(argv: Argv, runContext: RunContext): Promise<void> {
		const commands: Record<ArgvCommand, Function> = {
			[ArgvCommand.Import]: async () => {
				if (!argv.connection) throw new Error('--connection option is required');

				const toStorageConfig = parseStorageConnectionString(argv.connection);
				const batchSize = argv.batchSize || 1000;

				logger.info('Importing to storage:', toStorageConfig);
				logger.info(`Batch size: ${batchSize}`);

				await runContext.models.item().importContentToStorage(toStorageConfig, {
					batchSize: batchSize || 1000,
					logger: logger as Logger,
				});
			},

			[ArgvCommand.CheckConnection]: async () => {
				logger.info(await storageConnectionCheck(argv.connection, runContext.db, runContext.models));
			},
		};

		await commands[argv.command]();
	}

}
