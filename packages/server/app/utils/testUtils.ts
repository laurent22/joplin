import db, { User, Session, connectGlobalDb, DbConfig, disconnectGlobalDb } from '../db';
import UserModel from '../models/UserModel';
import SessionController from '../controllers/SessionController';
import cache from './cache';
import { createDb } from '../../tools/dbTools';
import dbConfig from '../db.config.tests';

// Takes into account the fact that this file will be inside the /dist
// directory when it runs.
const packageRootDir = `${__dirname}/../../..`;

// require('source-map-support').install();

// Wrap an async test in a try/catch block so that done() is always called
// and display a proper error message instead of "unhandled promise error"
export const asyncTest = function(callback: Function) {
	return async function(done: Function) {
		try {
			await callback();
		} catch (error) {
			if (error.constructor.name === 'ExpectationFailed') {
				// ExpectationFailed are handled correctly by Jasmine
			} else {
				console.error(error);
				expect('good').toBe('not good');
			}
		} finally {
			done();
		}
	};
};

export async function beforeAllDb(unitName: string) {
	const tempConfig: DbConfig = JSON.parse(JSON.stringify(dbConfig));
	tempConfig.connection.database = `joplintests_${unitName}`;
	await createDb(tempConfig, { dropIfExists: true });
	await connectGlobalDb(tempConfig);
}

export async function afterAllDb() {
	await disconnectGlobalDb();
}

export async function beforeEachDb() {
	await clearDatabase();

}

export const clearDatabase = async function(): Promise<void> {
	await db()('sessions').truncate();
	await db()('users').truncate();
	await db()('permissions').truncate();
	await db()('files').truncate();

	await cache.clearAll();
};

export const testAssetDir = `${packageRootDir}/assets/tests`;

interface UserAndSession {
	user: User;
	session: Session;
}

export const createUserAndSession = async function(index: number = 1, isAdmin: boolean = false): Promise<UserAndSession> {
	const userModel = new UserModel();
	const sessionController = new SessionController();

	const email: string = `user${index}@localhost`;
	const user = await userModel.save({ email: email, password: '123456', is_admin: isAdmin ? 1 : 0 }, { skipValidation: true });
	const session = await sessionController.authenticate(email, '123456');

	return {
		user: user,
		session: session,
	};
};

export const createUser = async function(index: number = 1, isAdmin: boolean = false): Promise<User> {
	const userModel = new UserModel();
	return userModel.save({ email: `user${index}@localhost`, password: '123456', is_admin: isAdmin ? 1 : 0 }, { skipValidation: true });
};

export async function checkThrowAsync(asyncFn: Function): Promise<any> {
	try {
		await asyncFn();
	} catch (error) {
		return error;
	}
	return null;
}
