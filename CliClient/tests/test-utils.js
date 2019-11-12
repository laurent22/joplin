/* eslint-disable require-atomic-updates */

const fs = require('fs-extra');
const { JoplinDatabase } = require('lib/joplin-database.js');
const { DatabaseDriverNode } = require('lib/database-driver-node.js');
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
const EncryptionService = require('lib/services/EncryptionService.js');
const DecryptionWorker = require('lib/services/DecryptionWorker.js');
const ResourceService = require('lib/services/ResourceService.js');
const RevisionService = require('lib/services/RevisionService.js');
const KvStore = require('lib/services/KvStore.js');
const WebDavApi = require('lib/WebDavApi');
const DropboxApi = require('lib/DropboxApi');

let databases_ = [];
let synchronizers_ = [];
let encryptionServices_ = [];
let revisionServices_ = [];
let decryptionWorkers_ = [];
let resourceServices_ = [];
let kvStores_ = [];
let fileApi_ = null;
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

SyncTargetRegistry.addClass(SyncTargetMemory);
SyncTargetRegistry.addClass(SyncTargetFilesystem);
SyncTargetRegistry.addClass(SyncTargetOneDrive);
SyncTargetRegistry.addClass(SyncTargetNextcloud);
SyncTargetRegistry.addClass(SyncTargetDropbox);

// const syncTargetId_ = SyncTargetRegistry.nameToId("nextcloud");
const syncTargetId_ = SyncTargetRegistry.nameToId('memory');
// const syncTargetId_ = SyncTargetRegistry.nameToId('filesystem');
// const syncTargetId_ = SyncTargetRegistry.nameToId('dropbox');
const syncDir = `${__dirname}/../tests/sync`;

const sleepTime = syncTargetId_ == SyncTargetRegistry.nameToId('filesystem') ? 1001 : 100;// 400;

console.info(`Testing with sync target: ${SyncTargetRegistry.idToName(syncTargetId_)}`);

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

Setting.setConstant('appId', 'net.cozic.joplin-cli');
Setting.setConstant('appType', 'cli');
Setting.setConstant('tempDir', tempDir);

BaseService.logger_ = logger;

Setting.autoSaveEnabled = false;

function syncTargetId() {
	return syncTargetId_;
}

function sleep(n) {
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			resolve();
		}, Math.round(n * 1000));
	});
}

async function switchClient(id) {
	if (!databases_[id]) throw new Error(`Call setupDatabaseAndSynchronizer(${id}) first!!`);

	await time.msleep(sleepTime); // Always leave a little time so that updated_time properties don't overlap
	await Setting.saveAll();

	currentClient_ = id;
	BaseModel.db_ = databases_[id];
	Folder.db_ = databases_[id];
	Note.db_ = databases_[id];
	BaseItem.db_ = databases_[id];
	Setting.db_ = databases_[id];
	Resource.db_ = databases_[id];

	BaseItem.encryptionService_ = encryptionServices_[id];
	Resource.encryptionService_ = encryptionServices_[id];
	BaseItem.revisionService_ = revisionServices_[id];

	Setting.setConstant('resourceDir', resourceDir(id));

	await Setting.load();

	if (!Setting.value('clientId')) Setting.setValue('clientId', uuid.create());
	Setting.setValue('sync.wipeOutFailSafe', false); // To keep things simple, always disable fail-safe unless explicitely set in the test itself
}

async function clearDatabase(id = null) {
	if (id === null) id = currentClient_;

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

async function setupDatabase(id = null) {
	if (id === null) id = currentClient_;

	Setting.cancelScheduleSave();
	Setting.cache_ = null;

	if (databases_[id]) {
		await clearDatabase(id);
		await Setting.load();
		if (!Setting.value('clientId')) Setting.setValue('clientId', uuid.create());
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

	BaseModel.db_ = databases_[id];
	await Setting.load();
	if (!Setting.value('clientId')) Setting.setValue('clientId', uuid.create());
}

function resourceDir(id = null) {
	if (id === null) id = currentClient_;
	return `${__dirname}/data/resources-${id}`;
}

async function setupDatabaseAndSynchronizer(id = null) {
	if (id === null) id = currentClient_;

	await setupDatabase(id);

	EncryptionService.instance_ = null;
	DecryptionWorker.instance_ = null;

	await fs.remove(resourceDir(id));
	await fs.mkdirp(resourceDir(id), 0o755);

	if (!synchronizers_[id]) {
		const SyncTargetClass = SyncTargetRegistry.classById(syncTargetId_);
		const syncTarget = new SyncTargetClass(db(id));
		syncTarget.setFileApi(fileApi());
		syncTarget.setLogger(logger);
		synchronizers_[id] = await syncTarget.synchronizer();
		synchronizers_[id].autoStartDecryptionWorker_ = false; // For testing we disable this since it would make the tests non-deterministic
	}

	encryptionServices_[id] = new EncryptionService();
	revisionServices_[id] = new RevisionService();
	decryptionWorkers_[id] = new DecryptionWorker();
	decryptionWorkers_[id].setEncryptionService(encryptionServices_[id]);
	resourceServices_[id] = new ResourceService();
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

	await service.loadMasterKey(masterKey, '123456', true);

	return masterKey;
}

function fileApi() {
	if (fileApi_) return fileApi_;

	if (syncTargetId_ == SyncTargetRegistry.nameToId('filesystem')) {
		fs.removeSync(syncDir);
		fs.mkdirpSync(syncDir, 0o755);
		fileApi_ = new FileApi(syncDir, new FileApiDriverLocal());
	} else if (syncTargetId_ == SyncTargetRegistry.nameToId('memory')) {
		fileApi_ = new FileApi('/root', new FileApiDriverMemory());
	} else if (syncTargetId_ == SyncTargetRegistry.nameToId('nextcloud')) {
		const options = {
			baseUrl: () => 'http://nextcloud.local/remote.php/dav/files/admin/JoplinTest',
			username: () => 'admin',
			password: () => '123456',
		};

		const api = new WebDavApi(options);
		fileApi_ = new FileApi('', new FileApiDriverWebDav(api));
	} else if (syncTargetId_ == SyncTargetRegistry.nameToId('dropbox')) {
		const api = new DropboxApi();
		const authTokenPath = `${__dirname}/support/dropbox-auth.txt`;
		const authToken = fs.readFileSync(authTokenPath, 'utf8');
		if (!authToken) throw new Error(`Dropbox auth token missing in ${authTokenPath}`);
		api.setAuthToken(authToken);
		fileApi_ = new FileApi('', new FileApiDriverDropbox(api));
	}

	fileApi_.setLogger(logger);
	fileApi_.setSyncTargetId(syncTargetId_);
	fileApi_.requestRepeatCount_ = 0;
	return fileApi_;
}

function objectsEqual(o1, o2) {
	if (Object.getOwnPropertyNames(o1).length !== Object.getOwnPropertyNames(o2).length) return false;
	for (let n in o1) {
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
			console.error(error);
			expect('good').toBe('not good', 'Test has thrown an exception - see above error');
		} finally {
			done();
		}
	};
}

async function allSyncTargetItemsEncrypted() {
	const list = await fileApi().list();
	const files = list.items;

	let totalCount = 0;
	let encryptedCount = 0;
	for (let i = 0; i < files.length; i++) {
		const file = files[i];
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

module.exports = { kvStore, resourceService, allSyncTargetItemsEncrypted, setupDatabase, revisionService, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync, encryptionService, loadEncryptionMasterKey, fileContentEqual, decryptionWorker, asyncTest };
