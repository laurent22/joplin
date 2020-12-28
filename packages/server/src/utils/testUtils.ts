import { User, Session, DbConnection, connectDb, disconnectDb, File } from '../db';
import { createDb } from '../tools/dbTools';
import modelFactory from '../models/factory';
import controllerFactory from '../controllers/factory';
import baseConfig from '../config-tests';
import { Config } from './types';
import { initConfig } from '../config';
import FileModel from '../models/FileModel';

// Takes into account the fact that this file will be inside the /dist directory
// when it runs.
const packageRootDir = `${__dirname}/../..`;

let db_: DbConnection = null;

// require('source-map-support').install();

export async function beforeAllDb(unitName: string) {
	const config: Config = {
		...baseConfig,
		database: {
			...baseConfig.database,
			name: unitName,
		},
	};

	initConfig(config);
	await createDb(config.database, { dropIfExists: true });
	db_ = await connectDb(config.database);
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
	await db_('changes').truncate();
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
	const sessionController = controllers().apiSession();

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

export async function createFileTree(fileModel: FileModel, parentId: string, tree: any): Promise<void> {
	for (const name in tree) {
		const children: any = tree[name];
		const isDir = children !== null;
		const newFile: File = await fileModel.save({
			parent_id: parentId,
			name: name,
			is_directory: isDir ? 1 : 0,
		});

		if (isDir && Object.keys(children).length) await createFileTree(fileModel, newFile.id, children);
	}
}

export async function checkThrowAsync(asyncFn: Function): Promise<any> {
	try {
		await asyncFn();
	} catch (error) {
		return error;
	}
	return null;
}

export async function expectThrow(asyncFn: Function, errorCode: any = undefined): Promise<any> {
	let hasThrown = false;
	let thrownError = null;
	try {
		await asyncFn();
	} catch (error) {
		hasThrown = true;
		thrownError = error;
	}

	if (!hasThrown) {
		expect('not throw').toBe('throw');
	} else if (thrownError.code !== errorCode) {
		console.error(thrownError);
		expect(`error code: ${thrownError.code}`).toBe(`error code: ${errorCode}`);
	} else {
		expect(true).toBe(true);
	}

	return thrownError;
}

export async function expectNotThrow(asyncFn: Function) {
	let thrownError = null;
	try {
		await asyncFn();
	} catch (error) {
		thrownError = error;
	}

	if (thrownError) {
		console.error(thrownError);
		expect(thrownError.message).toBe('');
	} else {
		expect(true).toBe(true);
	}
}
