/* eslint-disable require-atomic-updates */
import BaseApplication from '../BaseApplication';
import BaseModel from '../BaseModel';
import Logger, { TargetType, LoggerWrapper, LogLevel } from '@joplin/utils/Logger';
import Setting from '../models/Setting';
import BaseService from '../services/BaseService';
import FsDriverNode from '../fs-driver-node';
import time from '../time';
import shim from '../shim';
import uuid from '../uuid';
import ResourceService from '../services/ResourceService';
import KeymapService from '../services/KeymapService';
import KvStore from '../services/KvStore';
import KeychainServiceDriver from '../services/keychain/KeychainServiceDriver.node';
import KeychainServiceDriverDummy from '../services/keychain/KeychainServiceDriver.dummy';
import FileApiDriverJoplinServer from '../file-api-driver-joplinServer';
import OneDriveApi from '../onedrive-api';
import SyncTargetOneDrive from '../SyncTargetOneDrive';
import JoplinDatabase from '../JoplinDatabase';
import * as fs from 'fs-extra';
const { DatabaseDriverNode } = require('../database-driver-node.js');
import Folder from '../models/Folder';
import Note from '../models/Note';
import ItemChange from '../models/ItemChange';
import Resource from '../models/Resource';
import Tag from '../models/Tag';
import NoteTag from '../models/NoteTag';
import Revision from '../models/Revision';
import MasterKey from '../models/MasterKey';
import BaseItem from '../models/BaseItem';
import { FileApi } from '../file-api';
const FileApiDriverMemory = require('../file-api-driver-memory').default;
import FileApiDriverLocal from '../file-api-driver-local';
const { FileApiDriverWebDav } = require('../file-api-driver-webdav.js');
const { FileApiDriverDropbox } = require('../file-api-driver-dropbox.js');
const { FileApiDriverOneDrive } = require('../file-api-driver-onedrive.js');
import SyncTargetRegistry from '../SyncTargetRegistry';
const SyncTargetMemory = require('../SyncTargetMemory.js');
import SyncTargetFilesystem from '../SyncTargetFilesystem';
const SyncTargetNextcloud = require('../SyncTargetNextcloud.js');
const SyncTargetDropbox = require('../SyncTargetDropbox.js');
const SyncTargetAmazonS3 = require('../SyncTargetAmazonS3.js');
const SyncTargetWebDAV = require('../SyncTargetWebDAV.js');
import SyncTargetJoplinServer from '../SyncTargetJoplinServer';
import EncryptionService from '../services/e2ee/EncryptionService';
import DecryptionWorker from '../services/DecryptionWorker';
import RevisionService from '../services/RevisionService';
import ResourceFetcher from '../services/ResourceFetcher';
const WebDavApi = require('../WebDavApi');
const DropboxApi = require('../DropboxApi');
import JoplinServerApi from '../JoplinServerApi';
import { FolderEntity, ResourceEntity } from '../services/database/types';
import { credentialFile, readCredentialFile } from '../utils/credentialFiles';
import SyncTargetJoplinCloud from '../SyncTargetJoplinCloud';
import KeychainService from '../services/keychain/KeychainService';
import { loadKeychainServiceAndSettings } from '../services/SettingUtils';
import { setActiveMasterKeyId, setEncryptionEnabled } from '../services/synchronizer/syncInfoUtils';
import Synchronizer from '../Synchronizer';
import SyncTargetNone from '../SyncTargetNone';
import { setRSA } from '../services/e2ee/ppk';
const md5 = require('md5');
const { Dirnames } = require('../services/synchronizer/utils/types');
import RSA from '../services/e2ee/RSA.node';
import { State as ShareState } from '../services/share/reducer';
import initLib from '../initLib';
import OcrDriverTesseract from '../services/ocr/drivers/OcrDriverTesseract';
import OcrService from '../services/ocr/OcrService';
import { createWorker } from 'tesseract.js';
import { reg } from '../registry';

// Each suite has its own separate data and temp directory so that multiple
// suites can be run at the same time. suiteName is what is used to
// differentiate between suite and it is currently set to a random string
// (Ideally it would be something like the filename currently being executed by
// Jest, to make debugging easier, but it's not clear how to get this info).
const suiteName_ = uuid.createNano();

const databases_: JoplinDatabase[] = [];
let synchronizers_: Synchronizer[] = [];
const fileApis_: Record<number, FileApi> = {};
const encryptionServices_: EncryptionService[] = [];
const revisionServices_: RevisionService[] = [];
const decryptionWorkers_: DecryptionWorker[] = [];
const resourceServices_: ResourceService[] = [];
const resourceFetchers_: ResourceFetcher[] = [];
const kvStores_: KvStore[] = [];
let currentClient_ = 1;

// The line `process.on('unhandledRejection'...` in all the test files is going to
// make it throw this error. It's not too big a problem so disable it for now.
// https://stackoverflow.com/questions/9768444/possible-eventemitter-memory-leak-detected
process.setMaxListeners(0);

shim.setIsTestingEnv(true);

const fsDriver = new FsDriverNode();
Logger.fsDriver_ = fsDriver;
Resource.fsDriver_ = fsDriver;
EncryptionService.fsDriver_ = fsDriver;
FileApiDriverLocal.fsDriver_ = fsDriver;

// Most test units were historically under /app-cli so most test-related
// directories are there but that should be moved eventually under the right
// packages, or even out of the monorepo for temp files, logs, etc.
const oldTestDir = `${__dirname}/../../app-cli/tests`;
const logDir = `${oldTestDir}/logs`;
const baseTempDir = `${oldTestDir}/tmp/${suiteName_}`;
const supportDir = `${oldTestDir}/support`;
export const ocrSampleDir = `${oldTestDir}/ocr_samples`;

// We add a space in the data directory path as that will help uncover
// various space-in-path issues.
const dataDir = `${oldTestDir}/test data/${suiteName_}`;
const profileDir = `${dataDir}/profile`;
const rootProfileDir = profileDir;

fs.mkdirpSync(logDir);
fs.mkdirpSync(baseTempDir);
fs.mkdirpSync(dataDir);
fs.mkdirpSync(profileDir);

SyncTargetRegistry.addClass(SyncTargetNone);
SyncTargetRegistry.addClass(SyncTargetMemory);
SyncTargetRegistry.addClass(SyncTargetFilesystem);
SyncTargetRegistry.addClass(SyncTargetOneDrive);
SyncTargetRegistry.addClass(SyncTargetNextcloud);
SyncTargetRegistry.addClass(SyncTargetDropbox);
SyncTargetRegistry.addClass(SyncTargetAmazonS3);
SyncTargetRegistry.addClass(SyncTargetWebDAV);
SyncTargetRegistry.addClass(SyncTargetJoplinServer);
SyncTargetRegistry.addClass(SyncTargetJoplinCloud);

let syncTargetName_ = '';
let syncTargetId_: number = null;
let sleepTime = 0;
let isNetworkSyncTarget_ = false;

function syncTargetName() {
	return syncTargetName_;
}

function setSyncTargetName(name: string) {
	if (name === syncTargetName_) return syncTargetName_;
	const previousName = syncTargetName_;
	syncTargetName_ = name;
	syncTargetId_ = SyncTargetRegistry.nameToId(syncTargetName_);
	sleepTime = syncTargetId_ === SyncTargetRegistry.nameToId('filesystem') ? 1001 : 100;// 400;
	isNetworkSyncTarget_ = ['nextcloud', 'dropbox', 'onedrive', 'amazon_s3', 'joplinServer', 'joplinCloud'].includes(syncTargetName_);
	synchronizers_ = [];
	return previousName;
}

setSyncTargetName('memory');
// setSyncTargetName('filesystem');
// setSyncTargetName('nextcloud');
// setSyncTargetName('dropbox');
// setSyncTargetName('onedrive');
// setSyncTargetName('amazon_s3');
// setSyncTargetName('joplinServer');
// setSyncTargetName('joplinCloud');

// console.info(`Testing with sync target: ${syncTargetName_}`);

const syncDir = `${oldTestDir}/sync/${suiteName_}`;

// 90 seconds now that the tests are running in parallel and have been
// split into smaller suites might not be necessary but for now leave it
// anyway.
let defaultJestTimeout = 90 * 1000;
if (isNetworkSyncTarget_) defaultJestTimeout = 60 * 1000 * 10;
if (typeof jest !== 'undefined') jest.setTimeout(defaultJestTimeout);

const dbLogger = new Logger();
dbLogger.addTarget(TargetType.Console);
dbLogger.setLevel(Logger.LEVEL_WARN);

const logger = new Logger();
logger.addTarget(TargetType.Console);
logger.setLevel(LogLevel.Warn); // Set to DEBUG to display sync process in console

Logger.initializeGlobalLogger(logger);
initLib(logger);

BaseItem.loadClass('Note', Note);
BaseItem.loadClass('Folder', Folder);
BaseItem.loadClass('Resource', Resource);
BaseItem.loadClass('Tag', Tag);
BaseItem.loadClass('NoteTag', NoteTag);
BaseItem.loadClass('MasterKey', MasterKey);
BaseItem.loadClass('Revision', Revision);

Setting.setConstant('appId', 'net.cozic.joplintest-cli');
Setting.setConstant('appType', 'cli');
Setting.setConstant('tempDir', baseTempDir);
Setting.setConstant('cacheDir', baseTempDir);
Setting.setConstant('resourceDir', baseTempDir);
Setting.setConstant('pluginDataDir', `${profileDir}/profile/plugin-data`);
Setting.setConstant('profileDir', profileDir);
Setting.setConstant('rootProfileDir', rootProfileDir);
Setting.setConstant('env', 'dev');

BaseService.logger_ = logger;

Setting.autoSaveEnabled = false;

function syncTargetId() {
	return syncTargetId_;
}

function isNetworkSyncTarget() {
	return isNetworkSyncTarget_;
}

function sleep(n: number) {
	return new Promise((resolve) => {
		shim.setTimeout(() => {
			resolve(null);
		}, Math.round(n * 1000));
	});
}

function msleep(ms: number): Promise<void> {
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
		shim.setTimeout(() => {
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

function currentClientId() {
	return currentClient_;
}

async function afterEachCleanUp() {
	await ItemChange.waitForAllSaved();
	KeymapService.destroyInstance();
}

async function afterAllCleanUp() {
	if (fileApi()) {
		try {
			await fileApi().clearRoot();
		} catch (error) {
			console.warn('Could not clear sync target root:', error);
		}
	}
}

const settingFilename = (id: number): string => {
	return `settings-${id}.json`;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
async function switchClient(id: number, options: any = null) {
	options = { keychainEnabled: false, ...options };

	if (!databases_[id]) throw new Error(`Call setupDatabaseAndSynchronizer(${id}) first!!`);

	await time.msleep(sleepTime); // Always leave a little time so that updated_time properties don't overlap
	await Setting.saveAll();

	currentClient_ = id;
	BaseModel.setDb(databases_[id]);

	BaseItem.encryptionService_ = encryptionServices_[id];
	Resource.encryptionService_ = encryptionServices_[id];
	BaseItem.revisionService_ = revisionServices_[id];

	await Setting.reset();
	Setting.settingFilename = settingFilename(id);

	Setting.setConstant('profileDir', rootProfileDir);
	Setting.setConstant('rootProfileDir', rootProfileDir);
	Setting.setConstant('resourceDirName', resourceDirName(id));
	Setting.setConstant('resourceDir', resourceDir(id));
	Setting.setConstant('pluginDir', pluginDir(id));
	Setting.setConstant('isSubProfile', false);

	await loadKeychainServiceAndSettings(options.keychainEnabled ? KeychainServiceDriver : KeychainServiceDriverDummy);

	Setting.setValue('sync.target', syncTargetId());
	Setting.setValue('sync.wipeOutFailSafe', false); // To keep things simple, always disable fail-safe unless explicitly set in the test itself

	// More generally, this function should clear all data, and so that should
	// include settings.json
	await clearSettingFile(id);
}

async function clearDatabase(id: number = null) {
	if (id === null) id = currentClient_;
	if (!databases_[id]) return;

	await ItemChange.waitForAllSaved();

	const tableNames = [
		'deleted_items',
		'folders',
		'item_changes',
		'items_normalized',
		'key_values',
		'master_keys',
		'note_resources',
		'note_tags',
		'notes_normalized',
		'notes',
		'resources',
		'revisions',
		'settings',
		'sync_items',
		'tags',
	];

	const queries = [];
	for (const n of tableNames) {
		queries.push(`DELETE FROM ${n}`);
		queries.push(`DELETE FROM sqlite_sequence WHERE name="${n}"`); // Reset autoincremented IDs
	}
	await databases_[id].transactionExecBatch(queries);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
async function setupDatabase(id: number = null, options: any = null) {
	options = { keychainEnabled: false, ...options };

	if (id === null) id = currentClient_;

	Setting.cancelScheduleSave();

	// Note that this was changed from `Setting.cache_ = []` to `await
	// Setting.reset()` during the TypeScript conversion. Normally this is
	// more correct but something to keep in mind anyway in case there are
	// some strange async issue related to settings when the tests are
	// running.
	await Setting.reset();

	Setting.setConstant('profileDir', rootProfileDir);
	Setting.setConstant('rootProfileDir', rootProfileDir);
	Setting.setConstant('isSubProfile', false);

	if (databases_[id]) {
		BaseModel.setDb(databases_[id]);
		await clearDatabase(id);
		await loadKeychainServiceAndSettings(options.keychainEnabled ? KeychainServiceDriver : KeychainServiceDriverDummy);
		Setting.setValue('sync.target', syncTargetId());
		return;
	}

	const filePath = `${dataDir}/test-${id}.sqlite`;

	try {
		await fs.unlink(filePath);
	} catch (error) {
		// Don't care if the file doesn't exist
	}

	databases_[id] = new JoplinDatabase(new DatabaseDriverNode());
	databases_[id].setLogger(dbLogger);
	await databases_[id].open({ name: filePath });

	BaseModel.setDb(databases_[id]);
	await clearSettingFile(id);
	await loadKeychainServiceAndSettings(options.keychainEnabled ? KeychainServiceDriver : KeychainServiceDriverDummy);

	reg.setDb(databases_[id]);
	Setting.setValue('sync.target', syncTargetId());
}

async function clearSettingFile(id: number) {
	Setting.settingFilename = `settings-${id}.json`;
	await fs.remove(Setting.settingFilePath);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export async function createFolderTree(parentId: string, tree: any[], num = 0): Promise<FolderEntity> {
	let rootFolder: FolderEntity = null;

	for (const item of tree) {
		const isFolder = !!item.children;

		num++;

		const data = { ...item };
		delete data.children;

		if (isFolder) {
			const folder = await Folder.save({ title: `Folder ${num}`, parent_id: parentId, ...data });
			if (!rootFolder) rootFolder = folder;
			if (item.children.length) await createFolderTree(folder.id, item.children, num);
		} else {
			await Note.save({ title: `Note ${num}`, parent_id: parentId, ...data });
		}
	}

	return rootFolder;
}

function exportDir(id: number = null) {
	if (id === null) id = currentClient_;
	return `${dataDir}/export`;
}

function resourceDirName(id: number = null) {
	if (id === null) id = currentClient_;
	return `resources-${id}`;
}

function resourceDir(id: number = null) {
	if (id === null) id = currentClient_;
	return `${dataDir}/${resourceDirName(id)}`;
}

function pluginDir(id: number = null) {
	if (id === null) id = currentClient_;
	return `${dataDir}/plugins-${id}`;
}

export interface CreateNoteAndResourceOptions {
	path?: string;
}

const createNoteAndResource = async (options: CreateNoteAndResourceOptions = null) => {
	options = {
		path: `${supportDir}/photo.jpg`,
		...options,
	};

	let note = await Note.save({});
	note = await shim.attachFileToNote(note, options.path);
	const resourceIds = await Note.linkedItemIds(note.body);
	const resource: ResourceEntity = await Resource.load(resourceIds[0]);
	return { note, resource };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
async function setupDatabaseAndSynchronizer(id: number, options: any = null) {
	if (id === null) id = currentClient_;

	BaseService.logger_ = logger;

	await setupDatabase(id, options);

	EncryptionService.instance_ = null;
	DecryptionWorker.instance_ = null;

	await fs.remove(resourceDir(id));
	await fs.mkdirp(resourceDir(id));

	await fs.remove(pluginDir(id));
	await fs.mkdirp(pluginDir(id));

	if (!synchronizers_[id]) {
		const SyncTargetClass = SyncTargetRegistry.classById(syncTargetId_);
		const syncTarget = new SyncTargetClass(db(id));
		await initFileApi();
		syncTarget.setFileApi(fileApi());
		syncTarget.setLogger(logger);
		synchronizers_[id] = await syncTarget.synchronizer();

		// For now unset the share service as it's not properly initialised.
		// Share service tests are in ShareService.test.ts normally, and if it
		// becomes necessary to test integration with the synchroniser we can
		// initialize it here.
		synchronizers_[id].setShareService(null);
	}

	encryptionServices_[id] = new EncryptionService();
	revisionServices_[id] = new RevisionService();
	decryptionWorkers_[id] = new DecryptionWorker();
	decryptionWorkers_[id].setEncryptionService(encryptionServices_[id]);
	resourceServices_[id] = new ResourceService();
	resourceFetchers_[id] = new ResourceFetcher(() => { return synchronizers_[id].api(); });
	kvStores_[id] = new KvStore();

	setRSA(RSA);

	await fileApi().initialize();
	await fileApi().clearRoot();
}

function db(id: number = null): JoplinDatabase {
	if (id === null) id = currentClient_;
	return databases_[id];
}

function synchronizer(id: number = null) {
	if (id === null) id = currentClient_;
	return synchronizers_[id];
}

// This is like calling synchronizer.start() but it handles the
// complexity of passing around the sync context depending on
// the client.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
async function synchronizerStart(id: number = null, extraOptions: any = null) {
	if (id === null) id = currentClient_;

	const contextKey = `sync.${syncTargetId()}.context`;
	const contextString = Setting.value(contextKey);
	const context = contextString ? JSON.parse(contextString) : {};

	const options = { ...extraOptions };
	if (context) options.context = context;
	const newContext = await synchronizer(id).start(options);

	Setting.setValue(contextKey, JSON.stringify(newContext));

	return newContext;
}

function encryptionService(id: number = null) {
	if (id === null) id = currentClient_;
	return encryptionServices_[id];
}

function kvStore(id: number = null) {
	if (id === null) id = currentClient_;
	const o = kvStores_[id];
	o.setDb(db(id));
	return o;
}

function revisionService(id: number = null) {
	if (id === null) id = currentClient_;
	return revisionServices_[id];
}

function decryptionWorker(id: number = null) {
	if (id === null) id = currentClient_;
	const o = decryptionWorkers_[id];
	o.setKvStore(kvStore(id));
	return o;
}

function resourceService(id: number = null) {
	if (id === null) id = currentClient_;
	return resourceServices_[id];
}

function resourceFetcher(id: number = null) {
	if (id === null) id = currentClient_;
	return resourceFetchers_[id];
}

async function loadEncryptionMasterKey(id: number = null, useExisting = false) {
	const service = encryptionService(id);
	const password = '123456';

	let masterKey = null;

	if (!useExisting) { // Create it
		masterKey = await service.generateMasterKey(password);
		masterKey = await MasterKey.save(masterKey);
	} else { // Use the one already available
		const masterKeys = await MasterKey.all();
		if (!masterKeys.length) throw new Error('No master key available');
		masterKey = masterKeys[0];
	}

	const passwordCache = Setting.value('encryption.passwordCache');
	passwordCache[masterKey.id] = password;
	Setting.setValue('encryption.passwordCache', passwordCache);
	await Setting.saveAll();

	await service.loadMasterKey(masterKey, password, true);

	setActiveMasterKeyId(masterKey.id);

	return masterKey;
}

function mustRunInBand() {
	if (!process.argv.includes('--runInBand')) {
		throw new Error('Tests must be run sequentially for this sync target, with the --runInBand arg. eg `yarn test --runInBand`');
	}
}

async function initFileApi() {
	if (fileApis_[syncTargetId_]) return;

	let fileApi = null;
	if (syncTargetId_ === SyncTargetRegistry.nameToId('filesystem')) {
		fs.removeSync(syncDir);
		fs.mkdirpSync(syncDir);
		fileApi = new FileApi(syncDir, new FileApiDriverLocal());
	} else if (syncTargetId_ === SyncTargetRegistry.nameToId('memory')) {
		fileApi = new FileApi('/root', new FileApiDriverMemory());
	} else if (syncTargetId_ === SyncTargetRegistry.nameToId('nextcloud')) {
		const options = require(`${oldTestDir}/support/nextcloud-auth.json`);
		const api = new WebDavApi({
			baseUrl: () => options.baseUrl,
			username: () => options.username,
			password: () => options.password,
		});
		fileApi = new FileApi('', new FileApiDriverWebDav(api));
	} else if (syncTargetId_ === SyncTargetRegistry.nameToId('dropbox')) {
		// To get a token, go to the App Console:
		// https://www.dropbox.com/developers/apps/
		// Then select "JoplinTest" and click "Generated access token"
		const api = new DropboxApi();
		const authTokenPath = `${oldTestDir}/support/dropbox-auth.txt`;
		const authToken = fs.readFileSync(authTokenPath, 'utf8');
		if (!authToken) throw new Error(`Dropbox auth token missing in ${authTokenPath}`);
		api.setAuthToken(authToken);
		fileApi = new FileApi('', new FileApiDriverDropbox(api));
	} else if (syncTargetId_ === SyncTargetRegistry.nameToId('onedrive')) {
		// To get a token, open the URL below corresponding to your account type,
		// then copy the *complete* redirection URL in onedrive-auth.txt. Keep in mind that auth
		// data only lasts 1h for OneDrive.
		//
		// Personal OneDrive Account:
		// https://login.live.com/oauth20_authorize.srf?client_id=f1e68e1e-a729-4514-b041-4fdd5c7ac03a&scope=files.readwrite,offline_access&response_type=token&redirect_uri=https://joplinapp.org
		//
		// Business OneDrive Account:
		// https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=f1e68e1e-a729-4514-b041-4fdd5c7ac03a&scope=files.readwrite offline_access&response_type=token&redirect_uri=https://joplinapp.org
		//
		// Also for now OneDrive tests cannot be run in parallel because
		// for that each suite would need its own sub-directory within the
		// OneDrive app directory, and it's not clear how to get that
		// working.

		mustRunInBand();

		const { parameters, setEnvOverride } = require('../parameters.js');
		Setting.setConstant('env', 'dev');
		setEnvOverride('test');
		const config = parameters().oneDriveTest;
		const api = new OneDriveApi(config.id, config.secret, false);
		const authData = fs.readFileSync(await credentialFile('onedrive-auth.txt'), 'utf8');
		const urlInfo = require('url-parse')(authData, true);
		const auth = require('querystring').parse(urlInfo.hash.substr(1));
		api.setAuth(auth);

		const accountProperties = await api.execAccountPropertiesRequest();
		api.setAccountProperties(accountProperties);

		const appDir = await api.appDirectory();
		fileApi = new FileApi(appDir, new FileApiDriverOneDrive(api));
	} else if (syncTargetId_ === SyncTargetRegistry.nameToId('amazon_s3')) {
		// (Most of?) the @aws-sdk libraries depend on an old version of uuid
		// that doesn't work with jest (without converting ES6 exports to CommonJS).
		//
		// Require it dynamically so that this doesn't break test environments that
		// aren't configured to do this conversion.
		const { FileApiDriverAmazonS3 } = require('../file-api-driver-amazon-s3.js');
		const { S3Client } = require('@aws-sdk/client-s3');

		// We make sure for S3 tests run in band because tests
		// share the same directory which will cause locking errors.

		mustRunInBand();

		const amazonS3CredsPath = `${oldTestDir}/support/amazon-s3-auth.json`;
		const amazonS3Creds = require(amazonS3CredsPath);
		if (!amazonS3Creds || !amazonS3Creds.credentials) throw new Error(`AWS auth JSON missing in ${amazonS3CredsPath} format should be: { "credentials": { "accessKeyId": "", "secretAccessKey": "", } "bucket": "mybucket", region: "", forcePathStyle: ""}`);
		const api = new S3Client({ region: amazonS3Creds.region, credentials: amazonS3Creds.credentials, s3UseArnRegion: true, forcePathStyle: amazonS3Creds.forcePathStyle, endpoint: amazonS3Creds.endpoint });
		fileApi = new FileApi('', new FileApiDriverAmazonS3(api, amazonS3Creds.bucket));
	} else if (syncTargetId_ === SyncTargetRegistry.nameToId('joplinServer') || syncTargetId_ === SyncTargetRegistry.nameToId('joplinCloud')) {
		mustRunInBand();

		const joplinServerAuth = JSON.parse(await readCredentialFile('joplin-server-test-units-2.json'));

		// const joplinServerAuth = {
		//     "email": "admin@localhost",
		//     "password": "admin",
		//     "baseUrl": "http://api.joplincloud.local:22300",
		//     "userContentBaseUrl": ""
		// }

		// Note that to test the API in parallel mode, you need to use Postgres
		// as database, as the SQLite database is not reliable when being
		// read/write from multiple processes at the same time.
		const api = new JoplinServerApi({
			baseUrl: () => joplinServerAuth.baseUrl,
			userContentBaseUrl: () => joplinServerAuth.userContentBaseUrl,
			username: () => joplinServerAuth.email,
			password: () => joplinServerAuth.password,
		});

		fileApi = new FileApi('', new FileApiDriverJoplinServer(api));
	}

	fileApi.setLogger(logger);
	fileApi.setSyncTargetId(syncTargetId_);
	fileApi.setTempDirName(Dirnames.Temp);
	fileApi.requestRepeatCount_ = isNetworkSyncTarget_ ? 1 : 0;

	fileApis_[syncTargetId_] = fileApi;
}

function fileApi() {
	return fileApis_[syncTargetId_];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function objectsEqual(o1: any, o2: any) {
	if (Object.getOwnPropertyNames(o1).length !== Object.getOwnPropertyNames(o2).length) return false;
	for (const n in o1) {
		if (!o1.hasOwnProperty(n)) continue;
		if (o1[n] !== o2[n]) return false;
	}
	return true;
}

// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
async function checkThrowAsync(asyncFn: Function) {
	let hasThrown = false;
	try {
		await asyncFn();
	} catch (error) {
		hasThrown = true;
	}
	return hasThrown;
}

// eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any -- Old code before rule was applied, Old code before rule was applied
async function expectThrow(asyncFn: Function, errorCode: any = undefined, errorMessage: string = undefined) {
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
	} else if (errorMessage !== undefined) {
		if (thrownError.message !== errorMessage) {
			expect(`error message: ${thrownError.message}`).toBe(`error message: ${errorMessage}`);
		} else {
			expect(true).toBe(true);
		}
	} else if (thrownError.code !== errorCode) {
		console.error(thrownError);
		expect(`error code: ${thrownError.code}`).toBe(`error code: ${errorCode}`);
	} else {
		expect(true).toBe(true);
	}
}

// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
async function expectNotThrow(asyncFn: Function) {
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

// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
function checkThrow(fn: Function) {
	let hasThrown = false;
	try {
		fn();
	} catch (error) {
		hasThrown = true;
	}
	return hasThrown;
}

function fileContentEqual(path1: string, path2: string) {
	const fs = require('fs-extra');
	const content1 = fs.readFileSync(path1, 'base64');
	const content2 = fs.readFileSync(path2, 'base64');
	return content1 === content2;
}

async function allSyncTargetItemsEncrypted() {
	const list = await fileApi().list('', { includeDirs: false });
	const files = list.items;

	let totalCount = 0;
	let encryptedCount = 0;
	for (let i = 0; i < files.length; i++) {
		const file = files[i];
		if (!BaseItem.isSystemPath(file.path)) continue;

		const remoteContentString = await fileApi().get(file.path);
		const remoteContent = await BaseItem.unserialize(remoteContentString);
		const ItemClass = BaseItem.itemClass(remoteContent);

		if (!ItemClass.encryptionSupported()) continue;

		totalCount++;

		if (remoteContent.type_ === BaseModel.TYPE_RESOURCE) {
			const content = await fileApi().get(`.resource/${remoteContent.id}`);
			totalCount++;
			if (content.substr(0, 5) === 'JED01') encryptedCount++;
		}

		if (remoteContent.encryption_applied) encryptedCount++;
	}

	if (!totalCount) throw new Error('No encryptable item on sync target');

	return totalCount === encryptedCount;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function id(a: any) {
	return a.id;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function ids(a: any[]) {
	return a.map(n => n.id);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function sortedIds(a: any[]) {
	return ids(a).sort();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function at(a: any[], indexes: any[]) {
	const out = [];
	for (let i = 0; i < indexes.length; i++) {
		out.push(a[indexes[i]]);
	}
	return out;
}

async function createNTestFolders(n: number) {
	const folders = [];
	for (let i = 0; i < n; i++) {
		const folder = await Folder.save({ title: 'folder' });
		folders.push(folder);
		await time.msleep(10);
	}
	return folders;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
async function createNTestNotes(n: number, folder: any, tagIds: string[] = null, title = 'note') {
	const notes = [];
	for (let i = 0; i < n; i++) {
		const title_ = n > 1 ? `${title}${i}` : title;
		const note = await Note.save({ title: title_, parent_id: folder.id, is_conflict: 0, deleted_time: 0 });
		notes.push(note);
		await time.msleep(10);
	}
	if (tagIds) {
		for (let i = 0; i < notes.length; i++) {
			await Tag.setNoteTagsByIds(notes[i].id, tagIds);
			await time.msleep(10);
		}
	}
	return notes;
}

async function createNTestTags(n: number) {
	const tags = [];
	for (let i = 0; i < n; i++) {
		const tag = await Tag.save({ title: 'tag' });
		tags.push(tag);
		await time.msleep(10);
	}
	return tags;
}

function tempFilePath(ext: string) {
	return `${Setting.value('tempDir')}/${md5(Date.now() + Math.random())}.${ext}`;
}

const createTempFile = async (content = '') => {
	const path = tempFilePath('txt');
	await fs.writeFile(path, content, 'utf8');
	return path;
};

async function createTempDir() {
	const tempDirPath = `${baseTempDir}/${uuid.createNano()}`;
	await fs.mkdirp(tempDirPath);
	return tempDirPath;
}

async function waitForFolderCount(count: number) {
	const timeout = 2000;
	const startTime = Date.now();
	while (true) {
		const folders = await Folder.all();
		if (folders.length >= count) return;
		if (Date.now() - startTime > timeout) throw new Error('Timeout waiting for folders to be created');
		await msleep(10);
	}
}

let naughtyStrings_: string[] = null;
export async function naughtyStrings() {
	if (naughtyStrings_) return naughtyStrings_;
	const t = await fs.readFile(`${supportDir}/big-list-of-naughty-strings.txt`, 'utf8');
	const lines = t.split('\n');
	naughtyStrings_ = [];
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		if (trimmed.indexOf('#') === 0) continue;
		naughtyStrings_.push(line);
	}
	return naughtyStrings_;
}

// TODO: Update for Jest

// function mockDate(year, month, day, tick) {
// 	const fixedDate = new Date(2020, 0, 1);
// 	jasmine.clock().install();
// 	jasmine.clock().mockDate(fixedDate);
// }

// function restoreDate() {
// 	jasmine.clock().uninstall();
// }

// Application for feature integration testing
class TestApp extends BaseApplication {

	private hasGui_: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private middlewareCalls_: any[];
	private logger_: LoggerWrapper;

	public constructor(hasGui = true) {
		KeychainService.instance().enabled = false;

		super();
		this.hasGui_ = hasGui;
		this.middlewareCalls_ = [];
		this.logger_ = super.logger();
	}

	public hasGui() {
		return this.hasGui_;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async start(argv: any[]) {
		this.logger_.info('Test app starting...');

		if (!argv.includes('--profile')) {
			argv = argv.concat(['--profile', `tests-build/profile/${uuid.create()}`]);
		}
		argv = await super.start(['', ''].concat(argv), { setupGlobalLogger: false });

		// For now, disable sync and encryption to avoid spurious intermittent failures
		// caused by them interupting processing and causing delays.
		Setting.setValue('sync.interval', 0);
		setEncryptionEnabled(true);

		this.initRedux();
		Setting.dispatchUpdateAll();
		await ItemChange.waitForAllSaved();
		await this.wait();

		this.logger_.info('Test app started...');
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async generalMiddleware(store: any, next: any, action: any) {
		this.middlewareCalls_.push(true);
		try {
			await super.generalMiddleware(store, next, action);
		} finally {
			this.middlewareCalls_.pop();
		}
	}

	public async wait() {
		return new Promise((resolve) => {
			const iid = shim.setInterval(() => {
				if (!this.middlewareCalls_.length) {
					clearInterval(iid);
					resolve(null);
				}
			}, 100);
		});
	}

	public async profileDir() {
		return Setting.value('profileDir');
	}

	public async destroy() {
		this.logger_.info('Test app stopping...');
		await this.wait();
		await ItemChange.waitForAllSaved();
		this.deinitRedux();
		await super.destroy();
		await time.msleep(100);
	}
}

const createTestShareData = (shareId: string): ShareState => {
	return {
		processingShareInvitationResponse: false,
		shares: [],
		shareInvitations: [
			{
				id: '',
				master_key: {},
				status: 0,
				share: {
					id: shareId,
					folder_id: '',
					master_key_id: '',
					note_id: '',
					type: 1,
				},
				can_read: 1,
				can_write: 0,
			},
		],
		shareUsers: {},
	};
};

const simulateReadOnlyShareEnv = (shareId: string) => {
	Setting.setValue('sync.target', 10);
	Setting.setValue('sync.userId', 'abcd');
	BaseItem.syncShareCache = createTestShareData(shareId);

	return () => {
		BaseItem.syncShareCache = null;
		Setting.setValue('sync.userId', '');
	};
};

export const newOcrService = () => {
	const driver = new OcrDriverTesseract({ createWorker });
	return new OcrService(driver);
};

export const mockMobilePlatform = (platform: string) => {
	const originalMobilePlatform = shim.mobilePlatform;
	const originalIsNode = shim.isNode;

	shim.mobilePlatform = () => platform;
	shim.isNode = () => false;

	return {
		reset: () => {
			shim.mobilePlatform = originalMobilePlatform;
			shim.isNode = originalIsNode;
		},
	};
};

export { supportDir, createNoteAndResource, createTempFile, createTestShareData, simulateReadOnlyShareEnv, waitForFolderCount, afterAllCleanUp, exportDir, synchronizerStart, afterEachCleanUp, syncTargetName, setSyncTargetName, syncDir, createTempDir, isNetworkSyncTarget, kvStore, expectThrow, logger, expectNotThrow, resourceService, resourceFetcher, tempFilePath, allSyncTargetItemsEncrypted, msleep, setupDatabase, revisionService, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync, checkThrow, encryptionService, loadEncryptionMasterKey, fileContentEqual, decryptionWorker, currentClientId, id, ids, sortedIds, at, createNTestNotes, createNTestFolders, createNTestTags, TestApp };
