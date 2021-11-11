import { PositionalOptions, Options } from 'yargs';
import Logger from '@joplin/lib/Logger';
import BaseCommand, { RunContext } from './BaseCommand';
import parseStorageConnectionString from '../models/items/storage/parseStorageConnectionString';

const logger = Logger.create('ImportContentCommand');

interface Argv {
	toStorage: string;
	batchSize?: number;
}

export default class ImportContentCommand extends BaseCommand {

	public command() {
		return 'import-content <to-storage>';
	}

	public description() {
		return 'import content to storage';
	}

	public positionals(): Record<string, PositionalOptions> {
		return {
			'to-storage': {
				description: 'storage connection string',
				type: 'string',
			},
		};
	}

	public options(): Record<string, Options> {
		return {
			'batch-size': {
				type: 'number',
				description: 'Item batch size',
			},
		};
	}

	public async run(argv: Argv, runContext: RunContext): Promise<void> {
		const toStorageConfig = parseStorageConnectionString(argv.toStorage);
		const batchSize = argv.batchSize || 1000;

		logger.info('Importing to storage:', toStorageConfig);
		logger.info(`Batch size: ${batchSize}`);

		await runContext.models.item().importContentToStorage(toStorageConfig, {
			batchSize: batchSize || 1000,
			logger: logger as Logger,
		});
	}

}
