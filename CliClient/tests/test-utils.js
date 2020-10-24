/* eslint-disable require-atomic-updates */

const fs = require('fs-extra');
const { JoplinDatabase } = require('lib/joplin-database.js');
const { DatabaseDriverNode } = require('lib/database-driver-node.js');
const { BaseApplication } = require('lib/BaseApplication.js');
const BaseModel = require('lib/BaseModel.js');
const Folder = require('lib/models/Folder.js');
const Note = require('lib/models/Note.js');
const ItemChange = require('lib/models/ItemChange.js');
const Resource = require('lib/models/Resource.js');
const Tag = require('lib/models/Tag.js');
const NoteTag = require('lib/models/NoteTag.js');
const Revision = require('lib/models/Revision.js');
const { Logger } = require('lib/logger.js');
const Setting = require('lib/models/Setting.js');
const MasterKey = require('lib/models/MasterKey');
const BaseItem = require('lib/models/BaseItem.js');
const { FileApi } = require('lib/file-api.js');
const { FileApiDriverMemory } = require('lib/file-api-driver-memory.js');
const { FileApiDriverLocal } = require('lib/file-api-driver-local.js');
const { FileApiDriverWebDav } = require('lib/file-api-driver-webdav.js');
const { FileApiDriverDropbox } = require('lib/file-api-driver-dropbox.js');
const { FileApiDriverOneDrive } = require('lib/file-api-driver-onedrive.js');
const { FileApiDriverAmazonS3 } = require('lib/file-api-driver-amazon-s3.js');
const BaseService = require('lib/services/BaseService.js');
const { FsDriverNode } = require('lib/fs-driver-node.js');
const { time } = require('lib/time-utils.js');
const { shimInit } = require('lib/shim-init-node.js');
const { shim } = require('lib/shim.js');
const { uuid } = require('lib/uuid.js');
const SyncTargetRegistry = require('lib/SyncTargetRegistry.js');
const SyncTargetMemory = require('lib/SyncTargetMemory.js');
const SyncTargetFilesystem = require('lib/SyncTargetFilesystem.js');
const SyncTargetOneDrive = require('lib/SyncTargetOneDrive.js');
const SyncTargetNextcloud = require('lib/SyncTargetNextcloud.js');
const SyncTargetDropbox = require('lib/SyncTargetDropbox.js');
const SyncTargetAmazonS3 = require('lib/SyncTargetAmazonS3.js');
const EncryptionService = require('lib/services/EncryptionService.js');
const DecryptionWorker = require('lib/services/DecryptionWorker.js');
const ResourceService = require('lib/services/ResourceService.js');
const RevisionService = require('lib/services/RevisionService.js');
const ResourceFetcher = require('lib/services/ResourceFetcher.js');
const KvStore = require('lib/services/KvStore.js');
const WebDavApi = require('lib/WebDavApi');
const DropboxApi = require('lib/DropboxApi');
const { OneDriveApi } = require('lib/onedrive-api');
const { loadKeychainServiceAndSettings } = require('lib/services/SettingUtils');
const KeychainServiceDriver = require('lib/services/keychain/KeychainServiceDriver.node').default;
const KeychainServiceDriverDummy = require('lib/services/keychain/KeychainServiceDriver.dummy').default;
const md5 = require('md5');
const S3 = require('aws-sdk/clients/s3');

const databases_ = [];
let synchronizers_ = [];
const synchronizerContexts_ = {};
const fileApis_ = {};
const encryptionServices_ = [];
const revisionServices_ = [];
const decryptionWorkers_ = [];
const resourceServices_ = [];
const resourceFetchers_ = [];
const kvStores_ = [];
let currentClient_ = 1;

// The line `process.on('unhandledRejection'...` in all the test files is going to
// make it throw this error. It's not too big a problem so disable it for now.
// https://stackoverflow.com/questions/9768444/possible-eventemitter-memory-leak-detected
process.setMaxListeners(0);

shimInit();

shim.setIsTestingEnv(true);

const fsDriver = new FsDriverNode();
Logger.fsDriver_ = fsDriver;
Resource.fsDriver_ = fsDriver;
EncryptionService.fsDriver_ = fsDriver;
FileApiDriverLocal.fsDriver_ = fsDriver;

const logDir = `${__dirname}/../tests/logs`;
const tempDir = `${__dirname}/../tests/tmp`;
fs.mkdirpSync(logDir, 0o755);
fs.mkdirpSync(tempDir, 0o755);
fs.mkdirpSync(`${__dirname}/data`);

SyncTargetRegistry.addClass(SyncTargetMemory);
SyncTargetRegistry.addClass(SyncTargetFilesystem);
SyncTargetRegistry.addClass(SyncTargetOneDrive);
SyncTargetRegistry.addClass(SyncTargetNextcloud);
SyncTargetRegistry.addClass(SyncTargetDropbox);
SyncTargetRegistry.addClass(SyncTargetAmazonS3);

let syncTargetName_ = '';
let syncTargetId_ = null;
let sleepTime = 0;
let isNetworkSyncTarget_ = false;

function syncTargetName() {
	return syncTargetName_;
}

function setSyncTargetName(name) {
	if (name === syncTargetName_) return syncTargetName_;
	const previousName = syncTargetName_;
	syncTargetName_ = name;
	syncTargetId_ = SyncTargetRegistry.nameToId(syncTargetName_);
	sleepTime = syncTargetId_ == SyncTargetRegistry.nameToId('filesystem') ? 1001 : 100;// 400;
	isNetworkSyncTarget_ = ['nextcloud', 'dropbox', 'onedrive', 'amazon_s3'].includes(syncTargetName_);
	synchronizers_ = [];
	return previousName;
}

setSyncTargetName('memory');
// setSyncTargetName('nextcloud');
// setSyncTargetName('dropbox');
// setSyncTargetName('onedrive');
// setSyncTargetName('amazon_s3');

console.info(`Testing with sync target: ${syncTargetName_}`);

const syncDir = `${__dirname}/../tests/sync`;

let defaultJasmineTimeout = 90 * 1000;
if (isNetworkSyncTarget_) defaultJasmineTimeout = 60 * 1000 * 10;
if (typeof jasmine !== 'undefined') jasmine.DEFAULT_TIMEOUT_INTERVAL = defaultJasmineTimeout;

const dbLogger = new Logger();
dbLogger.addTarget('console');
dbLogger.addTarget('file', { path: `${logDir}/log.txt` });
dbLogger.setLevel(Logger.LEVEL_WARN);

const logger = new Logger();
logger.addTarget('console');
logger.addTarget('file', { path: `${logDir}/log.txt` });
logger.setLevel(Logger.LEVEL_WARN); // Set to DEBUG to display sync process in console

BaseItem.loadClass('Note', Note);
BaseItem.loadClass('Folder', Folder);
BaseItem.loadClass('Resource', Resource);
BaseItem.loadClass('Tag', Tag);
BaseItem.loadClass('NoteTag', NoteTag);
BaseItem.loadClass('MasterKey', MasterKey);
BaseItem.loadClass('Revision', Revision);

Setting.setConstant('appId', 'net.cozic.joplintest-cli');
Setting.setConstant('appType', 'cli');
Setting.setConstant('tempDir', tempDir);

BaseService.logger_ = logger;

Setting.autoSaveEnabled = false;

function syncTargetId() {
	return syncTargetId_;
}

function isNetworkSyncTarget() {
	return isNetworkSyncTarget_;
}

function sleep(n) {
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			resolve();
		}, Math.round(n * 1000));
	});
}

function msleep(ms) {
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			resolve();
		}, ms);
	});
}

function currentClientId() {
	return currentClient_;
}

async function switchClient(id, options = null) {
	options = Object.assign({}, { keychainEnabled: false }, options);

	if (!databases_[id]) throw new Error(`Call setupDatabaseAndSynchronizer(${id}) first!!`);

	await time.msleep(sleepTime); // Always leave a little time so that updated_time properties don't overlap
	await Setting.saveAll();

	currentClient_ = id;
	BaseModel.setDb(databases_[id]);

	BaseItem.encryptionService_ = encryptionServices_[id];
	Resource.encryptionService_ = encryptionServices_[id];
	BaseItem.revisionService_ = revisionServices_[id];

	Setting.setConstant('resourceDirName', resourceDirName(id));
	Setting.setConstant('resourceDir', resourceDir(id));

	await loadKeychainServiceAndSettings(options.keychainEnabled ? KeychainServiceDriver : KeychainServiceDriverDummy);

	Setting.setValue('sync.wipeOutFailSafe', false); // To keep things simple, always disable fail-safe unless explicitely set in the test itself
}

async function clearDatabase(id = null) {
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

async function setupDatabase(id = null, options = null) {
	options = Object.assign({}, { keychainEnabled: false }, options);

	if (id === null) id = currentClient_;

	Setting.cancelScheduleSave();
	Setting.cache_ = null;

	if (databases_[id]) {
		BaseModel.setDb(databases_[id]);
		await clearDatabase(id);
		await loadKeychainServiceAndSettings(options.keychainEnabled ? KeychainServiceDriver : KeychainServiceDriverDummy);
		return;
	}

	const filePath = `${__dirname}/data/test-${id}.sqlite`;

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

function resourceDirName(id = null) {
	if (id === null) id = currentClient_;
	return `resources-${id}`;
}

function resourceDir(id = null) {
	if (id === null) id = currentClient_;
	return `${__dirname}/data/${resourceDirName(id)}`;
}

async function setupDatabaseAndSynchronizer(id = null, options = null) {
	if (id === null) id = currentClient_;

	BaseService.logger_ = logger;

	await setupDatabase(id, options);

	EncryptionService.instance_ = null;
	DecryptionWorker.instance_ = null;

	await fs.remove(resourceDir(id));
	await fs.mkdirp(resourceDir(id), 0o755);

	if (!synchronizers_[id]) {
		const SyncTargetClass = SyncTargetRegistry.classById(syncTargetId_);
		const syncTarget = new SyncTargetClass(db(id));
		await initFileApi();
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

	await fileApi().clearRoot();
}

function db(id = null) {
	if (id === null) id = currentClient_;
	return databases_[id];
}

function synchronizer(id = null) {
	if (id === null) id = currentClient_;
	return synchronizers_[id];
}

// This is like calling synchronizer.start() but it handles the
// complexity of passing around the sync context depending on
// the client.
async function synchronizerStart(id = null, extraOptions = null) {
	if (id === null) id = currentClient_;
	const context = synchronizerContexts_[id];
	const options = Object.assign({}, extraOptions);
	if (context) options.context = context;
	const newContext = await synchronizer(id).start(options);
	synchronizerContexts_[id] = newContext;
	return newContext;
}

function encryptionService(id = null) {
	if (id === null) id = currentClient_;
	return encryptionServices_[id];
}

function kvStore(id = null) {
	if (id === null) id = currentClient_;
	const o = kvStores_[id];
	o.setDb(db(id));
	return o;
}

function revisionService(id = null) {
	if (id === null) id = currentClient_;
	return revisionServices_[id];
}

function decryptionWorker(id = null) {
	if (id === null) id = currentClient_;
	const o = decryptionWorkers_[id];
	o.setKvStore(kvStore(id));
	return o;
}

function resourceService(id = null) {
	if (id === null) id = currentClient_;
	return resourceServices_[id];
}

function resourceFetcher(id = null) {
	if (id === null) id = currentClient_;
	return resourceFetchers_[id];
}

async function loadEncryptionMasterKey(id = null, useExisting = false) {
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

async function initFileApi() {
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
		// redirection URL in onedrive-auth.txt. Keep in mind that auth data
		// only lasts 1h for OneDrive.
		// https://login.live.com/oauth20_authorize.srf?client_id=f1e68e1e-a729-4514-b041-4fdd5c7ac03a&scope=files.readwrite,offline_access&response_type=token&redirect_uri=https://joplinapp.org
		const { parameters, setEnvOverride } = require('lib/parameters.js');
		Setting.setConstant('env', 'dev');
		setEnvOverride('test');
		const config = parameters().oneDriveTest;
		const api = new OneDriveApi(config.id, config.secret, false);
		const authData = fs.readFileSync(`${__dirname}/support/onedrive-auth.txt`, 'utf8');
		const urlInfo = require('url-parse')(authData, true);
		const auth = require('querystring').parse(urlInfo.hash.substr(1));
		api.setAuth(auth);
		const appDir = await api.appDirectory();
		fileApi = new FileApi(appDir, new FileApiDriverOneDrive(api));
	} else if (syncTargetId_ == SyncTargetRegistry.nameToId('amazon_s3')) {
		const amazonS3CredsPath = `${__dirname}/support/amazon-s3-auth.json`;
		const amazonS3Creds = require(amazonS3CredsPath);
		if (!amazonS3Creds || !amazonS3Creds.accessKeyId) throw new Error(`AWS auth JSON missing in ${amazonS3CredsPath} format should be: { "accessKeyId": "", "secretAccessKey": "", "bucket": "mybucket"}`);
		const api = new S3({ accessKeyId: amazonS3Creds.accessKeyId, secretAccessKey: amazonS3Creds.secretAccessKey, s3UseArnRegion: true });
		fileApi = new FileApi('', new FileApiDriverAmazonS3(api, amazonS3Creds.bucket));
	}

	fileApi.setLogger(logger);
	fileApi.setSyncTargetId(syncTargetId_);
	fileApi.requestRepeatCount_ = isNetworkSyncTarget_ ? 1 : 0;

	fileApis_[syncTargetId_] = fileApi;
}

function fileApi() {
	return fileApis_[syncTargetId_];
}

function objectsEqual(o1, o2) {
	if (Object.getOwnPropertyNames(o1).length !== Object.getOwnPropertyNames(o2).length) return false;
	for (const n in o1) {
		if (!o1.hasOwnProperty(n)) continue;
		if (o1[n] !== o2[n]) return false;
	}
	return true;
}

async function checkThrowAsync(asyncFn) {
	let hasThrown = false;
	try {
		await asyncFn();
	} catch (error) {
		hasThrown = true;
	}
	return hasThrown;
}

async function expectThrow(asyncFn, errorCode = undefined) {
	let hasThrown = false;
	let thrownError = null;
	try {
		await asyncFn();
	} catch (error) {
		hasThrown = true;
		thrownError = error;
	}

	if (!hasThrown) {
		expect('not throw').toBe('throw', 'Expected function to throw an error but did not');
	} else if (thrownError.code !== errorCode) {
		console.error(thrownError);
		expect(`error code: ${thrownError.code}`).toBe(`error code: ${errorCode}`);
	} else {
		expect(true).toBe(true);
	}
}

async function expectNotThrow(asyncFn) {
	let thrownError = null;
	try {
		await asyncFn();
	} catch (error) {
		thrownError = error;
	}

	if (thrownError) {
		expect(thrownError.message).toBe('', 'Expected function not to throw an error but it did');
	} else {
		expect(true).toBe(true);
	}
}

function checkThrow(fn) {
	let hasThrown = false;
	try {
		fn();
	} catch (error) {
		hasThrown = true;
	}
	return hasThrown;
}

function fileContentEqual(path1, path2) {
	const fs = require('fs-extra');
	const content1 = fs.readFileSync(path1, 'base64');
	const content2 = fs.readFileSync(path2, 'base64');
	return content1 === content2;
}

// Wrap an async test in a try/catch block so that done() is always called
// and display a proper error message instead of "unhandled promise error"
function asyncTest(callback) {
	return async function(done) {
		try {
			await callback();
		} catch (error) {
			if (error.constructor && error.constructor.name === 'ExpectationFailed') {
				// OK - will be reported by Jasmine
			} else {
				console.error(error);
				expect(0).toBe(1, 'Test has thrown an exception - see above error');
			}
		} finally {
			done();
		}
	};
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

function id(a) {
	return a.id;
}

function ids(a) {
	return a.map(n => n.id);
}

function sortedIds(a) {
	return ids(a).sort();
}

function at(a, indexes) {
	const out = [];
	for (let i = 0; i < indexes.length; i++) {
		out.push(a[indexes[i]]);
	}
	return out;
}

async function createNTestFolders(n) {
	const folders = [];
	for (let i = 0; i < n; i++) {
		const folder = await Folder.save({ title: 'folder' });
		folders.push(folder);
		await time.msleep(10);
	}
	return folders;
}

async function createNTestNotes(n, folder, tagIds = null, title = 'note') {
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

async function createNTestTags(n) {
	const tags = [];
	for (let i = 0; i < n; i++) {
		const tag = await Tag.save({ title: 'tag' });
		tags.push(tag);
		await time.msleep(10);
	}
	return tags;
}

function tempFilePath(ext) {
	return `${Setting.value('tempDir')}/${md5(Date.now() + Math.random())}.${ext}`;
}

// Application for feature integration testing
class TestApp extends BaseApplication {
	constructor(hasGui = true) {
		super();
		this.hasGui_ = hasGui;
		this.middlewareCalls_ = [];
		this.logger_ = super.logger();
	}

	hasGui() {
		return this.hasGui_;
	}

	async start(argv) {
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

	async generalMiddleware(store, next, action) {
		this.middlewareCalls_.push(true);
		try {
			await super.generalMiddleware(store, next, action);
		} finally {
			this.middlewareCalls_.pop();
		}
	}

	async wait() {
		return new Promise((resolve) => {
			const iid = setInterval(() => {
				if (!this.middlewareCalls_.length) {
					clearInterval(iid);
					resolve();
				}
			}, 100);
		});
	}

	async profileDir() {
		return await Setting.value('profileDir');
	}

	async destroy() {
		this.logger_.info('Test app stopping...');
		await this.wait();
		await ItemChange.waitForAllSaved();
		this.deinitRedux();
		await super.destroy();
		await time.msleep(100);
	}
}

module.exports = { synchronizerStart, syncTargetName, setSyncTargetName, syncDir, isNetworkSyncTarget, kvStore, expectThrow, logger, expectNotThrow, resourceService, resourceFetcher, tempFilePath, allSyncTargetItemsEncrypted, msleep, setupDatabase, revisionService, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync, checkThrow, encryptionService, loadEncryptionMasterKey, fileContentEqual, decryptionWorker, asyncTest, currentClientId, id, ids, sortedIds, at, createNTestNotes, createNTestFolders, createNTestTags, TestApp };
