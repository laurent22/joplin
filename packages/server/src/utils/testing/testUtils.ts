import { User, Session, DbConnection, connectDb, disconnectDb, File, truncateTables, sqliteFilePath, Item } from '../../db';
import { createDb } from '../../tools/dbTools';
import modelFactory from '../../models/factory';
import { AppContext, Env } from '../types';
import config, { initConfig } from '../../config';
import FileModel from '../../models/FileModel';
import Logger from '@joplin/lib/Logger';
import FakeCookies from './koa/FakeCookies';
import FakeRequest from './koa/FakeRequest';
import FakeResponse from './koa/FakeResponse';
import * as httpMocks from 'node-mocks-http';
import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import * as jsdom from 'jsdom';
import setupAppContext from '../setupAppContext';
import { ApiError } from '../errors';
import { putApi } from './apiUtils';
import { FolderEntity, NoteEntity } from '@joplin/lib/services/database/types';
import ItemModel from '../../models/ItemModel';
import { ModelType } from '@joplin/lib/BaseModel';

// Takes into account the fact that this file will be inside the /dist directory
// when it runs.
const packageRootDir = `${__dirname}/../../..`;

let db_: DbConnection = null;

// require('source-map-support').install();

export function randomHash(): string {
	return crypto.createHash('md5').update(`${Date.now()}-${Math.random()}`).digest('hex');
}

let tempDir_: string = null;
export async function tempDir(): Promise<string> {
	if (tempDir_) return tempDir_;
	tempDir_ = `${packageRootDir}/temp/${randomHash()}`;
	await fs.mkdirp(tempDir_);
	return tempDir_;
}

export async function makeTempFileWithContent(content: string | Buffer): Promise<string> {
	const d = await tempDir();
	const filePath = `${d}/${randomHash()}`;
	if (typeof content === 'string') {
		await fs.writeFile(filePath, content, 'utf8');
	} else {
		await fs.writeFile(filePath, content);
	}
	return filePath;
}

let createdDbName_: string = null;
export async function beforeAllDb(unitName: string) {
	createdDbName_ = unitName;

	initConfig({
		SQLITE_DATABASE: createdDbName_,
	});

	await createDb(config().database, { dropIfExists: true });
	db_ = await connectDb(config().database);
}

export async function afterAllTests() {
	if (db_) {
		await disconnectDb(db_);
		db_ = null;
	}

	if (tempDir_) {
		await fs.remove(tempDir_);
		tempDir_ = null;
	}

	if (createdDbName_) {
		const filePath = sqliteFilePath(createdDbName_);
		await fs.remove(filePath);
		createdDbName_ = null;
	}
}

export async function beforeEachDb() {
	await truncateTables(db_);
}

export interface AppContextTestOptions {
	// owner?: User;
	sessionId?: string;
	request?: any;
}

function initGlobalLogger() {
	const globalLogger = new Logger();
	Logger.initializeGlobalLogger(globalLogger);
}

export function msleep(ms: number) {
	// It seems setTimeout can sometimes last less time than the provided
	// interval:
	//
	// https://stackoverflow.com/a/50912029/561309
	//
	// This can cause issues in tests where we expect the actual duration to be
	// the same as the provided interval or more, but not less. So the code
	// below check that the elapsed time is no less than the provided interval,
	// and if it is, it waits a bit longer.
	const startTime = Date.now();
	return new Promise((resolve) => {
		setTimeout(() => {
			if (Date.now() - startTime < ms) {
				const iid = setInterval(() => {
					if (Date.now() - startTime >= ms) {
						clearInterval(iid);
						resolve(null);
					}
				}, 2);
			} else {
				resolve(null);
			}
		}, ms);
	});
}

export async function koaAppContext(options: AppContextTestOptions = null): Promise<AppContext> {
	if (!db_) throw new Error('Database must be initialized first');

	options = {
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

	if (options.sessionId) {
		reqOptions.headers['x-api-auth'] = options.sessionId;
	}

	const req = httpMocks.createRequest(reqOptions);
	req.__isMocked = true;

	const owner = options.sessionId ? await models().session().sessionUser(options.sessionId) : null;

	const appLogger = Logger.create('AppTest');

	// Set type to "any" because the Koa context has many properties and we
	// don't need to mock all of them.
	const appContext: any = {};

	await setupAppContext(appContext, Env.Dev, db_, () => appLogger);

	appContext.env = Env.Dev;
	appContext.db = db_;
	appContext.models = models();
	appContext.appLogger = () => appLogger;
	appContext.path = req.url;
	appContext.owner = owner;
	appContext.cookies = new FakeCookies();
	appContext.request = new FakeRequest(req);
	appContext.response = new FakeResponse();
	appContext.headers = { ...reqOptions.headers };
	appContext.req = req;
	appContext.query = req.query;
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

export function parseHtml(html: string): Document {
	const dom = new jsdom.JSDOM(html);
	return dom.window.document;
}

interface CreateUserAndSessionOptions {
	email?: string;
	password?: string;
}

export const createUserAndSession = async function(index: number = 1, isAdmin: boolean = false, options: CreateUserAndSessionOptions = null): Promise<UserAndSession> {
	options = {
		email: `user${index}@localhost`,
		password: '123456',
		...options,
	};

	const user = await models().user().save({ email: options.email, password: options.password, is_admin: isAdmin ? 1 : 0 }, { skipValidation: true });
	const session = await models().session().authenticate(options.email, options.password);

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

export async function createItemTree(itemModel: ItemModel, parentFolderId: string, tree: any): Promise<void> {
	for (const jopId in tree) {
		const children: any = tree[jopId];
		const isFolder = children !== null;

		const newItem: Item = await itemModel.save({
			jop_parent_id: parentFolderId,
			jop_id: jopId,
			jop_type: isFolder ? ModelType.Folder : ModelType.Note,
			name: `${jopId}.md`,
			content: Buffer.from(`{"title":"Item ${jopId}"}`),
		});

		if (isFolder && Object.keys(children).length) await createItemTree(itemModel, newItem.jop_id, children);
	}
}

export async function createFile(userId: string, path: string, content: string): Promise<File> {
	const fileModel = models().file({ userId });
	const file: File = await fileModel.pathToFile(path, { mustExist: false, returnFullEntity: false });
	file.content = Buffer.from(content);
	const savedFile = await fileModel.save(file);
	return fileModel.load(savedFile.id);
}

export async function createFile2(sessionId: string, path: string, content: string): Promise<File> {
	const tempFilePath = await makeTempFileWithContent(content);
	const file = await putApi(sessionId, `files/${path}/content`, null, { filePath: tempFilePath });
	await fs.remove(tempFilePath);
	return file;
}

export async function createItem(sessionId: string, path: string, content: string | Buffer): Promise<Item> {
	const tempFilePath = await makeTempFileWithContent(content);
	const item: Item = await putApi(sessionId, `items/${path}/content`, null, { filePath: tempFilePath });
	await fs.remove(tempFilePath);
	return models().item().load(item.id);
}

export async function updateItem(sessionId: string, path: string, content: string): Promise<Item> {
	const tempFilePath = await makeTempFileWithContent(content);
	const item: Item = await putApi(sessionId, `items/${path}/content`, null, { filePath: tempFilePath });
	await fs.remove(tempFilePath);
	return models().item().load(item.id);
}

export async function createNote(sessionId: string, note: NoteEntity): Promise<Item> {
	note = {
		id: '00000000000000000000000000000001',
		title: 'Note title',
		body: 'Note body',
		...note,
	};

	return createItem(sessionId, `root:/${note.id}.md:`, makeNoteSerializedBody(note));
}

export async function createFolder(sessionId: string, folder: NoteEntity): Promise<Item> {
	folder = {
		id: '000000000000000000000000000000F1',
		title: 'Folder title',
		...folder,
	};

	return createItem(sessionId, `root:/${folder.id}.md:`, makeFolderSerializedBody(folder));
}

export async function updateFile(userId: string, path: string, content: string): Promise<File> {
	const fileModel = models().file({ userId });
	const file: File = await fileModel.pathToFile(path, { returnFullEntity: true });

	await fileModel.save({
		...file,
		content: Buffer.from(content),
	});

	return fileModel.load(file.id);
}

export function checkContextError(context: AppContext) {
	if (context.response.status >= 400) {
		// console.info(context.response.body);
		throw new ApiError(`${context.method} ${context.path} ${JSON.stringify(context.response)}`, context.response.status);
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

export function makeNoteSerializedBody(note: NoteEntity = {}): string {
	return `${'title' in note ? note.title : 'Title'}

${'body' in note ? note.body : 'Body'}

id: ${'id' in note ? note.id : 'b39dadd7a63742bebf3125fd2a9286d4'}
parent_id: ${'parent_id' in note ? note.parent_id : '000000000000000000000000000000F1'}
created_time: 2020-10-15T10:34:16.044Z
updated_time: 2021-01-28T23:10:30.054Z
is_conflict: 0
latitude: 0.00000000
longitude: 0.00000000
altitude: 0.0000
author: 
source_url: 
is_todo: 1
todo_due: 1602760405000
todo_completed: 0
source: joplindev-desktop
source_application: net.cozic.joplindev-desktop
application_data: 
order: 0
user_created_time: 2020-10-15T10:34:16.044Z
user_updated_time: 2020-10-19T17:21:03.394Z
encryption_cipher_text: 
encryption_applied: 0
markup_language: 1
is_shared: 1
type_: 1`;
}

function makeFolderSerializedBody(folder: FolderEntity = {}): string {
	return `${'title' in folder ? folder.title : 'Title'}

id: ${folder.id || '000000000000000000000000000000F1'}
created_time: 2020-11-11T18:44:14.534Z
updated_time: 2020-11-11T18:44:14.534Z
user_created_time: 2020-11-11T18:44:14.534Z
user_updated_time: 2020-11-11T18:44:14.534Z
encryption_cipher_text:
encryption_applied: 0
parent_id:
is_shared: 0
type_: 2`;
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
