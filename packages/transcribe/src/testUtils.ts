import { remove } from 'fs-extra';
import createQueue from './services/createQueue';
import env from './env';

export const initDb = async (sqliteFile: string) => {
	const envVariables = env();
	envVariables.QUEUE_DRIVER = 'sqlite';
	envVariables.QUEUE_DATABASE_NAME = sqliteFile;
	const queue = await createQueue(envVariables, true);
	return queue;
};

export const cleanUpDb = async (filePath: string) => {
	await remove(filePath);
};
