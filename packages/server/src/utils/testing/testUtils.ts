import { User, Session, DbConnection, connectDb, disconnectDb, File, truncateTables } from '../../db';
import { createDb } from '../../tools/dbTools';
import modelFactory from '../../models/factory';
import controllerFactory from '../../controllers/factory';
import baseConfig from '../../config-tests';
import { AppContext, Config, Env } from '../types';
import { initConfig } from '../../config';
import FileModel from '../../models/FileModel';
import Logger from '@joplin/lib/Logger';
import FakeCookies from './koa/FakeCookies';
import FakeRequest from './koa/FakeRequest';
import FakeResponse from './koa/FakeResponse';
import * as httpMocks from 'node-mocks-http';

// Takes into account the fact that this file will be inside the /dist directory
// when it runs.
const packageRootDir = `${__dirname}/../../..`;

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
	await truncateTables(db_);
}

interface AppContextTestOptions {
	// path?: string;
	owner?: User;
	sessionId?: string;
	request?: any;
}

function initGlobalLogger() {
	const globalLogger = new Logger();
	Logger.initializeGlobalLogger(globalLogger);
}

export async function koaAppContext(options: AppContextTestOptions = null): Promise<AppContext> {
	if (!db_) throw new Error('Database must be initialized first');

	options = {
		// path: '/home',
		...options,
	};

	initGlobalLogger();

	const reqOptions = {
		...options.request,
	};

	if (!reqOptions.method) reqOptions.method = 'GET';
	if (!reqOptions.url) reqOptions.url = '/home';
	if (!reqOptions.headers) reqOptions.headers = {};
	if (!reqOptions.headers['content-type']) reqOptions.headers['content-type'] = 'application/json';

	const req = httpMocks.createRequest(reqOptions);
	req.__isMocked = true;

	const appLogger = Logger.create('AppTest');

	// Set type to "any" because the Koa context has many properties and we
	// don't need to mock all of them.
	const appContext: any = {};

	appContext.env = Env.Dev;
	appContext.db = db_;
	appContext.models = models();
	appContext.controllers = controllers();
	appContext.appLogger = () => appLogger;

	appContext.path = req.url;
	appContext.owner = options.owner;
	appContext.cookies = new FakeCookies();
	appContext.request = new FakeRequest(req);
	appContext.response = new FakeResponse();
	appContext.req = req;
	appContext.method = req.method;

	if (options.sessionId) {
		appContext.cookies.set('sessionId', options.sessionId);
	}

	return appContext as AppContext;
}

export function koaNext(): Promise<void> {
	return Promise.resolve();
}

export const testAssetDir = `${packageRootDir}/assets/tests`;

interface UserAndSession {
	user: User;
	session: Session;
}

export function db() {
	return db_;
}

function baseUrl() {
	return 'http://localhost:22300';
}

export function models() {
	return modelFactory(db(), baseUrl());
}

export function controllers() {
	return controllerFactory(models());
}

interface CreateUserAndSessionOptions {
	email?: string;
	password?: string;
}

export const createUserAndSession = async function(index: number = 1, isAdmin: boolean = false, options: CreateUserAndSessionOptions = null): Promise<UserAndSession> {
	const sessionController = controllers().apiSession();

	options = {
		email: `user${index}@localhost`,
		password: '123456',
		...options,
	};

	const user = await models().user().save({ email: options.email, password: options.password, is_admin: isAdmin ? 1 : 0 }, { skipValidation: true });
	const session = await sessionController.authenticate(options.email, options.password);

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
