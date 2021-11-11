import { PositionalOptions, Options } from 'yargs';
import Logger from '@joplin/lib/Logger';
import BaseCommand, { RunContext } from './BaseCommand';
import parseStorageConnectionString from '../models/items/storage/parseStorageConnectionString';
import loadStorageDriver from '../models/items/storage/loadStorageDriver';
import uuidgen from '../utils/uuidgen';
import { Context } from '../models/items/storage/StorageDriverBase';

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
				const storageConfig = parseStorageConnectionString(argv.connection);
				const driver = await loadStorageDriver(storageConfig, runContext.db, { assignDriverId: false });
				const itemId = `testingconnection${uuidgen(8)}`;
				const itemContent = Buffer.from(uuidgen(8));
				const context: Context = { models: runContext.models };

				try {
					await driver.write(itemId, itemContent, context);
				} catch (error) {
					error.message = `Could not write content to storage: ${error.message}`;
					throw error;
				}

				if (!(await driver.exists(itemId, context))) {
					throw new Error(`Written item does not exist: ${itemId}`);
				}

				const readContent = await driver.read(itemId, context);
				if (readContent.toString() !== itemContent.toString()) throw new Error(`Could not read back written item. Expected: ${itemContent.toString()}. Got: ${readContent.toString()}`);

				await driver.delete(itemId, context);

				if (await driver.exists(itemId, context)) {
					throw new Error(`Deleted item still exist: ${itemId}`);
				}

				logger.info('Item was written, read back and deleted without any error.');
			},
		};

		await commands[argv.command]();
	}

}
