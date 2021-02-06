/* eslint-disable require-atomic-updates */
import BaseApplication from '@joplin/lib/BaseApplication';
import BaseModel from '@joplin/lib/BaseModel';
import Logger, { TargetType, LoggerWrapper } from '@joplin/lib/Logger';
import Setting from '@joplin/lib/models/Setting';
import BaseService from '@joplin/lib/services/BaseService';
import FsDriverNode from '@joplin/lib/fs-driver-node';
import time from '@joplin/lib/time';
import shim from '@joplin/lib/shim';
import uuid from '@joplin/lib/uuid';
import ResourceService from '@joplin/lib/services/ResourceService';
import KeymapService from '@joplin/lib/services/KeymapService';
import KvStore from '@joplin/lib/services/KvStore';
import KeychainServiceDriver from '@joplin/lib/services/keychain/KeychainServiceDriver.node';
import KeychainServiceDriverDummy from '@joplin/lib/services/keychain/KeychainServiceDriver.dummy';
import PluginRunner from '../app/services/plugins/PluginRunner';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import FileApiDriverJoplinServer from '@joplin/lib/file-api-driver-joplinServer';
import OneDriveApi from '@joplin/lib/onedrive-api';
import SyncTargetOneDrive from '@joplin/lib/SyncTargetOneDrive';
import JoplinDatabase from '@joplin/lib/JoplinDatabase';

const fs = require('fs-extra');
const { DatabaseDriverNode } = require('@joplin/lib/database-driver-node.js');
import Folder from '@joplin/lib/models/Folder';
import Note from '@joplin/lib/models/Note';
import ItemChange from '@joplin/lib/models/ItemChange';
import Resource from '@joplin/lib/models/Resource';
import Tag from '@joplin/lib/models/Tag';
import NoteTag from '@joplin/lib/models/NoteTag';
import Revision from '@joplin/lib/models/Revision';
import MasterKey from '@joplin/lib/models/MasterKey';
import BaseItem from '@joplin/lib/models/BaseItem';
const { FileApi } = require('@joplin/lib/file-api.js');
const { FileApiDriverMemory } = require('@joplin/lib/file-api-driver-memory.js');
const { FileApiDriverLocal } = require('@joplin/lib/file-api-driver-local.js');
const { FileApiDriverWebDav } = require('@joplin/lib/file-api-driver-webdav.js');
const { FileApiDriverDropbox } = require('@joplin/lib/file-api-driver-dropbox.js');
const { FileApiDriverOneDrive } = require('@joplin/lib/file-api-driver-onedrive.js');
const { FileApiDriverAmazonS3 } = require('@joplin/lib/file-api-driver-amazon-s3.js');
const { shimInit } = require('@joplin/lib/shim-init-node.js');
const SyncTargetRegistry = require('@joplin/lib/SyncTargetRegistry.js');
const SyncTargetMemory = require('@joplin/lib/SyncTargetMemory.js');
const SyncTargetFilesystem = require('@joplin/lib/SyncTargetFilesystem.js');
const SyncTargetNextcloud = require('@joplin/lib/SyncTargetNextcloud.js');
const SyncTargetDropbox = require('@joplin/lib/SyncTargetDropbox.js');
const SyncTargetAmazonS3 = require('@joplin/lib/SyncTargetAmazonS3.js');
import SyncTargetJoplinServer from '@joplin/lib/SyncTargetJoplinServer';
import EncryptionService from '@joplin/lib/services/EncryptionService';
import DecryptionWorker from '@joplin/lib/services/DecryptionWorker';
import RevisionService from '@joplin/lib/services/RevisionService';
import ResourceFetcher from '@joplin/lib/services/ResourceFetcher';
const WebDavApi = require('@joplin/lib/WebDavApi');
const DropboxApi = require('@joplin/lib/DropboxApi');
import JoplinServerApi from '@joplin/lib/JoplinServerApi';
const { loadKeychainServiceAndSettings } = require('@joplin/lib/services/SettingUtils');
const md5 = require('md5');
const S3 = require('aws-sdk/clients/s3');
const { Dirnames } = require('@joplin/lib/services/synchronizer/utils/types');
const sharp = require('sharp');
const { credentialFile } = require('@joplin/tools/tool-utils');

// Each suite has its own separate data and temp directory so that multiple
// suites can be run at the same time. suiteName is what is used to
// differentiate between suite and it is currently set to a random string
// (Ideally it would be something like the filename currently being executed by
// Jest, to make debugging easier, but it's not clear how to get this info).
const suiteName_ = uuid.createNano();

const databases_: any[] = [];
let synchronizers_: any[] = [];
const synchronizerContexts_: any = {};
const fileApis_: any = {};
const encryptionServices_: any[] = [];
const revisionServices_: any[] = [];
const decryptionWorkers_: any[] = [];
const resourceServices_: any[] = [];
const resourceFetchers_: any[] = [];
const kvStores_: KvStore[] = [];
let currentClient_ = 1;

// The line `process.on('unhandledRejection'...` in all the test files is going to
// make it throw this error. It's not too big a problem so disable it for now.
// https://stackoverflow.com/questions/9768444/possible-eventemitter-memory-leak-detected
process.setMaxListeners(0);

let keytar;
try {
	keytar = shim.platformSupportsKeyChain() ? require('keytar') : null;
} catch (error) {
	console.error('Cannot load keytar - keychain support will be disabled', error);
	keytar = null;
}

shimInit(sharp, keytar);

shim.setIsTestingEnv(true);

const fsDriver = new FsDriverNode();
Logger.fsDriver_ = fsDriver;
Resource.fsDriver_ = fsDriver;
EncryptionService.fsDriver_ = fsDriver;
FileApiDriverLocal.fsDriver_ = fsDriver;

const logDir = `${__dirname}/../tests/logs`;
const baseTempDir = `${__dirname}/../tests/tmp/${suiteName_}`;
const supportDir = `${__dirname}/support`;

// We add a space in the data directory path as that will help uncover
// various space-in-path issues.
const dataDir = `${__dirname}/test data/${suiteName_}`;

fs.mkdirpSync(logDir, 0o755);
fs.mkdirpSync(baseTempDir, 0o755);
fs.mkdirpSync(dataDir);

SyncTargetRegistry.addClass(SyncTargetMemory);
SyncTargetRegistry.addClass(SyncTargetFilesystem);
SyncTargetRegistry.addClass(SyncTargetOneDrive);
SyncTargetRegistry.addClass(SyncTargetNextcloud);
SyncTargetRegistry.addClass(SyncTargetDropbox);
SyncTargetRegistry.addClass(SyncTargetAmazonS3);
SyncTargetRegistry.addClass(SyncTargetJoplinServer);

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
	sleepTime = syncTargetId_ == SyncTargetRegistry.nameToId('filesystem') ? 1001 : 100;// 400;
	isNetworkSyncTarget_ = ['nextcloud', 'dropbox', 'onedrive', 'amazon_s3', 'joplinServer'].includes(syncTargetName_);
	synchronizers_ = [];
	return previousName;
}

setSyncTargetName('memory');
// setSyncTargetName('nextcloud');
// setSyncTargetName('dropbox');
// setSyncTargetName('onedrive');
// setSyncTargetName('amazon_s3');
// setSyncTargetName('joplinServer');

// console.info(`Testing with sync target: ${syncTargetName_}`);

const syncDir = `${__dirname}/../tests/sync/${suiteName_}`;

// 90 seconds now that the tests are running in parallel and have been
// split into smaller suites might not be necessary but for now leave it
// anyway.
let defaultJestTimeout = 90 * 1000;
if (isNetworkSyncTarget_) defaultJestTimeout = 60 * 1000 * 10;
jest.setTimeout(defaultJestTimeout);

const dbLogger = new Logger();
dbLogger.addTarget(TargetType.Console);
dbLogger.setLevel(Logger.LEVEL_WARN);

const logger = new Logger();
logger.addTarget(TargetType.Console);
logger.setLevel(Logger.LEVEL_WARN); // Set to DEBUG to display sync process in console

Logger.initializeGlobalLogger(logger);

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
Setting.setConstant('pluginDataDir', `${dataDir}/plugin-data`);
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

function msleep(ms: number) {
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

async function switchClient(id: number, options: any = null) {
	options = Object.assign({}, { keychainEnabled: false }, options);

	if (!databases_[id]) throw new Error(`Call setupDatabaseAndSynchronizer(${id}) first!!`);

	await time.msleep(sleepTime); // Always leave a little time so that updated_time properties don't overlap
	await Setting.saveAll();

	currentClient_ = id;
	BaseModel.setDb(databases_[id]);

	BaseItem.encryptionService_ = encryptionServices_[id];
	Resource.encryptionService_ = encryptionServices_[id];
	BaseItem.revisionService_ = revisionServices_[id];

	await Setting.reset();
	Setting.setConstant('resourceDirName', resourceDirName(id));
	Setting.setConstant('resourceDir', resourceDir(id));
	Setting.setConstant('pluginDir', pluginDir(id));

	await loadKeychainServiceAndSettings(options.keychainEnabled ? KeychainServiceDriver : KeychainServiceDriverDummy);

	Setting.setValue('sync.wipeOutFailSafe', false); // To keep things simple, always disable fail-safe unless explicitely set in the test itself
}

async function clearDatabase(id: number = null) {
	if (id === null) id = currentClient_;
	if (!databases_[id]) return;

	await ItemChange.waitForAllSaved();

	const tableNames = [
		'notes',
		'folders',
		'resources',
		'tags',
		'note_tags',
		'master_keys',
		'item_changes',
		'note_resources',
		'settings',
		'deleted_items',
		'sync_items',
		'notes_normalized',
		'revisions',
		'key_values',
	];

	const queries = [];
	for (const n of tableNames) {
		queries.push(`DELETE FROM ${n}`);
		queries.push(`DELETE FROM sqlite_sequence WHERE name="${n}"`); // Reset autoincremented IDs
	}
	await databases_[id].transactionExecBatch(queries);
}

async function setupDatabase(id: number = null, options: any = null) {
	options = Object.assign({}, { keychainEnabled: false }, options);

	if (id === null) id = currentClient_;

	Setting.cancelScheduleSave();

	// Note that this was changed from `Setting.cache_ = []` to `await
	// Setting.reset()` during the TypeScript conversion. Normally this is
	// more correct but something to keep in mind anyway in case there are
	// some strange async issue related to settings when the tests are
	// running.
	await Setting.reset();

	if (databases_[id]) {
		BaseModel.setDb(databases_[id]);
		await clearDatabase(id);
		await loadKeychainServiceAndSettings(options.keychainEnabled ? KeychainServiceDriver : KeychainServiceDriverDummy);
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
	await loadKeychainServiceAndSettings(options.keychainEnabled ? KeychainServiceDriver : KeychainServiceDriverDummy);
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

async function setupDatabaseAndSynchronizer(id: number, options: any = null) {
	if (id === null) id = currentClient_;

	BaseService.logger_ = logger;

	await setupDatabase(id, options);

	EncryptionService.instance_ = null;
	DecryptionWorker.instance_ = null;

	await fs.remove(resourceDir(id));
	await fs.mkdirp(resourceDir(id), 0o755);

	await fs.remove(pluginDir(id));
	await fs.mkdirp(pluginDir(id), 0o755);

	if (!synchronizers_[id]) {
		const SyncTargetClass = SyncTargetRegistry.classById(syncTargetId_);
		const syncTarget = new SyncTargetClass(db(id));
		await initFileApi(suiteName_);
		syncTarget.setFileApi(fileApi());
		syncTarget.setLogger(logger);
		synchronizers_[id] = await syncTarget.synchronizer();
		synchronizerContexts_[id] = null;
	}

	encryptionServices_[id] = new EncryptionService();
	revisionServices_[id] = new RevisionService();
	decryptionWorkers_[id] = new DecryptionWorker();
	decryptionWorkers_[id].setEncryptionService(encryptionServices_[id]);
	resourceServices_[id] = new ResourceService();
	resourceFetchers_[id] = new ResourceFetcher(() => { return synchronizers_[id].api(); });
	kvStores_[id] = new KvStore();

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
async function synchronizerStart(id: number = null, extraOptions: any = null) {
	if (id === null) id = currentClient_;
	const context = synchronizerContexts_[id];
	const options = Object.assign({}, extraOptions);
	if (context) options.context = context;
	const newContext = await synchronizer(id).start(options);
	synchronizerContexts_[id] = newContext;
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

	let masterKey = null;

	if (!useExisting) { // Create it
		masterKey = await service.generateMasterKey('123456');
		masterKey = await MasterKey.save(masterKey);
	} else { // Use the one already available
		const masterKeys = await MasterKey.all();
		if (!masterKeys.length) throw new Error('No master key available');
		masterKey = masterKeys[0];
	}

	await service.loadMasterKey_(masterKey, '123456', true);

	return masterKey;
}

async function initFileApi(suiteName: string) {
	if (fileApis_[syncTargetId_]) return;

	let fileApi = null;
	if (syncTargetId_ == SyncTargetRegistry.nameToId('filesystem')) {
		fs.removeSync(syncDir);
		fs.mkdirpSync(syncDir, 0o755);
		fileApi = new FileApi(syncDir, new FileApiDriverLocal());
	} else if (syncTargetId_ == SyncTargetRegistry.nameToId('memory')) {
		fileApi = new FileApi('/root', new FileApiDriverMemory());
	} else if (syncTargetId_ == SyncTargetRegistry.nameToId('nextcloud')) {
		const options = require(`${__dirname}/../tests/support/nextcloud-auth.json`);
		const api = new WebDavApi({
			baseUrl: () => options.baseUrl,
			username: () => options.username,
			password: () => options.password,
		});
		fileApi = new FileApi('', new FileApiDriverWebDav(api));
	} else if (syncTargetId_ == SyncTargetRegistry.nameToId('dropbox')) {
		// To get a token, go to the App Console:
		// https://www.dropbox.com/developers/apps/
		// Then select "JoplinTest" and click "Generated access token"
		const api = new DropboxApi();
		const authTokenPath = `${__dirname}/support/dropbox-auth.txt`;
		const authToken = fs.readFileSync(authTokenPath, 'utf8');
		if (!authToken) throw new Error(`Dropbox auth token missing in ${authTokenPath}`);
		api.setAuthToken(authToken);
		fileApi = new FileApi('', new FileApiDriverDropbox(api));
	} else if (syncTargetId_ == SyncTargetRegistry.nameToId('onedrive')) {
		// To get a token, open the URL below, then copy the *complete*
		// redirection URL in onedrive-auth.txt. Keep in mind that auth
		// data only lasts 1h for OneDrive.
		//
		// https://login.live.com/oauth20_authorize.srf?client_id=f1e68e1e-a729-4514-b041-4fdd5c7ac03a&scope=files.readwrite,offline_access&response_type=token&redirect_uri=https://joplinapp.org
		//
		// Also for now OneDrive tests cannot be run in parallel because
		// for that each suite would need its own sub-directory within the
		// OneDrive app directory, and it's not clear how to get that
		// working.

		if (!process.argv.includes('--runInBand')) {
			throw new Error('OneDrive tests must be run sequentially, with the --runInBand arg. eg `npm test -- --runInBand`');
		}

		const { parameters, setEnvOverride } = require('@joplin/lib/parameters.js');
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
	} else if (syncTargetId_ == SyncTargetRegistry.nameToId('amazon_s3')) {
		const amazonS3CredsPath = `${__dirname}/support/amazon-s3-auth.json`;
		const amazonS3Creds = require(amazonS3CredsPath);
		if (!amazonS3Creds || !amazonS3Creds.accessKeyId) throw new Error(`AWS auth JSON missing in ${amazonS3CredsPath} format should be: { "accessKeyId": "", "secretAccessKey": "", "bucket": "mybucket"}`);
		const api = new S3({ accessKeyId: amazonS3Creds.accessKeyId, secretAccessKey: amazonS3Creds.secretAccessKey, s3UseArnRegion: true });
		fileApi = new FileApi('', new FileApiDriverAmazonS3(api, amazonS3Creds.bucket));
	} else if (syncTargetId_ == SyncTargetRegistry.nameToId('joplinServer')) {
		// Note that to test the API in parallel mode, you need to use Postgres
		// as database, as the SQLite database is not reliable when being
		// read/write from multiple processes at the same time.
		const api = new JoplinServerApi({
			baseUrl: () => 'http://localhost:22300',
			username: () => 'admin@localhost',
			password: () => 'admin',
		});
		fileApi = new FileApi(`Apps/Joplin-${suiteName}`, new FileApiDriverJoplinServer(api));
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

function objectsEqual(o1: any, o2: any) {
	if (Object.getOwnPropertyNames(o1).length !== Object.getOwnPropertyNames(o2).length) return false;
	for (const n in o1) {
		if (!o1.hasOwnProperty(n)) continue;
		if (o1[n] !== o2[n]) return false;
	}
	return true;
}

async function checkThrowAsync(asyncFn: Function) {
	let hasThrown = false;
	try {
		await asyncFn();
	} catch (error) {
		hasThrown = true;
	}
	return hasThrown;
}

async function expectThrow(asyncFn: Function, errorCode: any = undefined) {
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
}

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

function id(a: any) {
	return a.id;
}

function ids(a: any[]) {
	return a.map(n => n.id);
}

function sortedIds(a: any[]) {
	return ids(a).sort();
}

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

async function createNTestNotes(n: number, folder: any, tagIds: string[] = null, title: string = 'note') {
	const notes = [];
	for (let i = 0; i < n; i++) {
		const title_ = n > 1 ? `${title}${i}` : title;
		const note = await Note.save({ title: title_, parent_id: folder.id, is_conflict: 0 });
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

async function createTempDir() {
	const tempDirPath = `${baseTempDir}/${uuid.createNano()}`;
	await fs.mkdirp(tempDirPath);
	return tempDirPath;
}

function newPluginService(appVersion = '1.4') {
	const runner = new PluginRunner();
	const service = new PluginService();
	service.initialize(
		appVersion,
		{
			joplin: {},
		},
		runner,
		{
			dispatch: () => {},
			getState: () => {},
		}
	);
	return service;
}

function newPluginScript(script: string) {
	return `
		/* joplin-manifest:
		{
			"id": "org.joplinapp.plugins.PluginTest",
			"manifest_version": 1,
			"app_min_version": "1.4",
			"name": "JS Bundle test",
			"version": "1.0.0"
		}
		*/
		
		${script}
	`;
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
	private middlewareCalls_: any[];
	private logger_: LoggerWrapper;

	public constructor(hasGui = true) {
		super();
		this.hasGui_ = hasGui;
		this.middlewareCalls_ = [];
		this.logger_ = super.logger();
	}

	public hasGui() {
		return this.hasGui_;
	}

	public async start(argv: any[]) {
		this.logger_.info('Test app starting...');

		if (!argv.includes('--profile')) {
			argv = argv.concat(['--profile', `tests-build/profile/${uuid.create()}`]);
		}
		argv = await super.start(['',''].concat(argv));

		// For now, disable sync and encryption to avoid spurious intermittent failures
		// caused by them interupting processing and causing delays.
		Setting.setValue('sync.interval', 0);
		Setting.setValue('encryption.enabled', false);

		this.initRedux();
		Setting.dispatchUpdateAll();
		await ItemChange.waitForAllSaved();
		await this.wait();

		this.logger_.info('Test app started...');
	}

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

export { supportDir, waitForFolderCount, afterAllCleanUp, exportDir, newPluginService, newPluginScript, synchronizerStart, afterEachCleanUp, syncTargetName, setSyncTargetName, syncDir, createTempDir, isNetworkSyncTarget, kvStore, expectThrow, logger, expectNotThrow, resourceService, resourceFetcher, tempFilePath, allSyncTargetItemsEncrypted, msleep, setupDatabase, revisionService, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync, checkThrow, encryptionService, loadEncryptionMasterKey, fileContentEqual, decryptionWorker, currentClientId, id, ids, sortedIds, at, createNTestNotes, createNTestFolders, createNTestTags, TestApp };
