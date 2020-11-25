import { User, Session, DbConnection, connectDb, disconnectDb } from '../db';
import cache from './cache';
import { createDb } from '../tools/dbTools';
import createDbConfig from '../db.config.tests';
import modelFactory from '../models/factory';
import controllerFactory from '../controllers/factory';

// Takes into account the fact that this file will be inside the /dist
// directory when it runs.
const packageRootDir = `${__dirname}/../..`;

let db_: DbConnection = null;

// require('source-map-support').install();

export async function beforeAllDb(unitName: string) {
	const dbConfig = createDbConfig(unitName, 'sqlite3');
	await createDb(dbConfig, { dropIfExists: true });
	db_ = await connectDb(dbConfig);
}

export async function afterAllDb() {
	await disconnectDb(db_);
	db_ = null;
}

export async function beforeEachDb() {
	await clearDatabase();
}

export const clearDatabase = async function(): Promise<void> {
	await db_('sessions').truncate();
	await db_('users').truncate();
	await db_('permissions').truncate();
	await db_('files').truncate();

	await cache.clearAll();
};

export const testAssetDir = `${packageRootDir}/assets/tests`;

interface UserAndSession {
	user: User;
	session: Session;
}

export function db() {
	return db_;
}

export function models() {
	return modelFactory(db());
}

export function controllers() {
	return controllerFactory(models());
}

export const createUserAndSession = async function(index: number = 1, isAdmin: boolean = false): Promise<UserAndSession> {
	const sessionController = controllers().session();

	const email: string = `user${index}@localhost`;
	const user = await models().user().save({ email: email, password: '123456', is_admin: isAdmin ? 1 : 0 }, { skipValidation: true });
	const session = await sessionController.authenticate(email, '123456');

	return {
		user: user,
		session: session,
	};
};

export const createUser = async function(index: number = 1, isAdmin: boolean = false): Promise<User> {
	return models().user().save({ email: `user${index}@localhost`, password: '123456', is_admin: isAdmin ? 1 : 0 }, { skipValidation: true });
};

export async function checkThrowAsync(asyncFn: Function): Promise<any> {
	try {
		await asyncFn();
	} catch (error) {
		return error;
	}
	return null;
}
