import { DbConnection, dropTables, migrateDb } from '../db';
import newModelFactory from '../models/factory';
import { Config } from '../utils/types';

export async function handleDebugCommands(argv: any, db: DbConnection, config: Config): Promise<boolean> {
	if (argv.debugCreateTestUsers) {
		await createTestUsers(db, config);
	} else {
		return false;
	}

	return true;
}

export async function createTestUsers(db: DbConnection, config: Config) {
	await dropTables(db);
	await migrateDb(db);

	const models = newModelFactory(db, config);

	for (let userNum = 1; userNum <= 2; userNum++) {
		await models.user().save({
			email: `user${userNum}@example.com`,
			password: '123456',
			full_name: `User ${userNum}`,
		});
	}
}
