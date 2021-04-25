import { connectDb, disconnectDb } from '../db';
import newModelFactory from '../models/factory';
import { Config } from '../utils/types';
import { createDb, dropDb } from './dbTools';

export async function handleDebugCommands(argv: any, config: Config): Promise<boolean> {
	if (argv.debugCreateTestUsers) {
		await createTestUsers(config);
	} else {
		return false;
	}

	return true;
}

export async function createTestUsers(config: Config) {
	await dropDb(config.database, { ignoreIfNotExists: true });
	await createDb(config.database);

	const db = await connectDb(config.database);

	const models = newModelFactory(db, config.baseUrl);

	for (let userNum = 1; userNum <= 2; userNum++) {
		await models.user().save({
			email: `user${userNum}@example.com`,
			password: '123456',
			full_name: `User ${userNum}`,
		});
	}

	await disconnectDb(db);
}
