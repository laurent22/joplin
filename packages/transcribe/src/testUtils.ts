import { remove } from 'fs-extra';
import createQueue from './services/createQueue';
import env, { ComputedEnvVariables } from './env';

export const initDb = async (sqliteFile: string) => {
	const envVariables = env();
	const testEnv: ComputedEnvVariables = {
		...envVariables,
		QUEUE_DRIVER: 'sqlite',
		QUEUE_DATABASE_NAME: sqliteFile,
	};
	const queue = await createQueue(testEnv, true);
	return queue;
};

export const cleanUpDb = async (filePath: string) => {
	await remove(filePath);
};
