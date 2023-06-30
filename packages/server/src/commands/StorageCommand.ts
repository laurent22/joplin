import { PositionalOptions, Options } from 'yargs';
import Logger from '@joplin/lib/Logger';
import BaseCommand, { RunContext } from './BaseCommand';
import parseStorageConnectionString from '../models/items/storage/parseStorageConnectionString';
import storageConnectionCheck from '../utils/storageConnectionCheck';

const logger = Logger.create('ImportContentCommand');

enum ArgvCommand {
	Import = 'import',
	CheckConnection = 'check-connection',
	DeleteDatabaseContentColumn = 'delete-database-content-col',
}

interface Argv {
	command: ArgvCommand;
	connection?: string;
	batchSize?: number;
	maxContentSize?: number;
	maxProcessedItems?: number;
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
					ArgvCommand.DeleteDatabaseContentColumn,
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
			'max-content-size': {
				type: 'number',
				description: 'Max content size',
			},
			'max-processed-items': {
				type: 'number',
				description: 'Max number of items to process before stopping',
			},
			'connection': {
				description: 'storage connection string',
				type: 'string',
			},
		};
	}

	public async run(argv: Argv, runContext: RunContext): Promise<void> {
		const batchSize = argv.batchSize || 1000;

		// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
		const commands: Record<ArgvCommand, Function> = {
			[ArgvCommand.Import]: async () => {
				if (!argv.connection) throw new Error('--connection option is required');

				const toStorageConfig = parseStorageConnectionString(argv.connection);
				const maxContentSize = argv.maxContentSize || 200000000;

				logger.info('Importing to storage:', toStorageConfig);
				logger.info(`Batch size: ${batchSize}`);
				logger.info(`Max content size: ${maxContentSize}`);

				await runContext.models.item().importContentToStorage(toStorageConfig, {
					batchSize,
					maxContentSize,
					logger,
				});
			},

			[ArgvCommand.CheckConnection]: async () => {
				logger.info(await storageConnectionCheck(argv.connection, runContext.db, runContext.models));
			},

			[ArgvCommand.DeleteDatabaseContentColumn]: async () => {
				const maxProcessedItems = argv.maxProcessedItems;

				logger.info(`Batch size: ${batchSize}`);

				await runContext.models.item().deleteDatabaseContentColumn({
					batchSize,
					logger,
					maxProcessedItems,
				});
			},
		};

		await commands[argv.command]();
	}

}
