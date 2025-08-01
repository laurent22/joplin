import Logger from '@joplin/utils/Logger';
import PgBossQueue from './queue/PgBossQueue';
import SqliteQueue from './queue/SqliteQueue';
import { EnvVariables } from '../env';

const logger = Logger.create('createQueue');

const createQueue = async (envVariables: EnvVariables, isPrimary: boolean) => {
	logger.info('Choosing queue');

	if (envVariables.QUEUE_DRIVER === 'pg') {
		const queue = new PgBossQueue('transcribe', {
			database: {
				name: envVariables.QUEUE_DATABASE_NAME,
				user: envVariables.QUEUE_DATABASE_USER,
				password: envVariables.QUEUE_DATABASE_PASSWORD,
				port: envVariables.QUEUE_DATABASE_PORT,
				host: envVariables.QUEUE_DATABASE_HOST,
			},
			ttl: envVariables.QUEUE_TTL,
			maintenanceInterval: envVariables.QUEUE_MAINTENANCE_INTERVAL,
			retryCount: envVariables.QUEUE_RETRY_COUNT,
		});
		logger.info('Starting');
		await queue.init();
		return queue;
	} else if (envVariables.QUEUE_DRIVER === 'sqlite') {
		const queue = new SqliteQueue('transcribe', {
			database: {
				name: envVariables.QUEUE_DATABASE_NAME,
			},
			ttl: envVariables.QUEUE_TTL,
			retryCount: envVariables.QUEUE_RETRY_COUNT,
			maintenanceInterval: envVariables.QUEUE_MAINTENANCE_INTERVAL,
		});
		logger.info('Starting');
		await queue.init(isPrimary);
		return queue;

	}

	throw Error(`There is no queue configuration for this QUEUE_DRIVER: ${envVariables.QUEUE_DRIVER}`);


};

export default createQueue;
