const fs = require('fs-extra');
const { JoplinDatabase } = require('lib/joplin-database.js');
const { DatabaseDriverNode } = require('lib/database-driver-node.js');
const BaseModel = require('lib/BaseModel.js');
const Folder = require('lib/models/Folder.js');
const Note = require('lib/models/Note.js');
const Resource = require('lib/models/Resource.js');
const Tag = require('lib/models/Tag.js');
const NoteTag = require('lib/models/NoteTag.js');
const { Logger } = require('lib/logger.js');
const Setting = require('lib/models/Setting.js');
const MasterKey = require('lib/models/MasterKey');
const BaseItem = require('lib/models/BaseItem.js');
const { Synchronizer } = require('lib/synchronizer.js');
const { FileApi } = require('lib/file-api.js');
const { FileApiDriverMemory } = require('lib/file-api-driver-memory.js');
const { FileApiDriverLocal } = require('lib/file-api-driver-local.js');
const { FileApiDriverWebDav } = require('lib/file-api-driver-webdav.js');
const { FsDriverNode } = require('lib/fs-driver-node.js');
const { time } = require('lib/time-utils.js');
const { shimInit } = require('lib/shim-init-node.js');
const SyncTargetRegistry = require('lib/SyncTargetRegistry.js');
const SyncTargetMemory = require('lib/SyncTargetMemory.js');
const SyncTargetFilesystem = require('lib/SyncTargetFilesystem.js');
const SyncTargetOneDrive = require('lib/SyncTargetOneDrive.js');
const SyncTargetNextcloud = require('lib/SyncTargetNextcloud.js');
const EncryptionService = require('lib/services/EncryptionService.js');
const DecryptionWorker = require('lib/services/DecryptionWorker.js');
const WebDavApi = require('lib/WebDavApi');

let databases_ = [];
let synchronizers_ = [];
let encryptionServices_ = [];
let decryptionWorkers_ = [];
let fileApi_ = null;
let currentClient_ = 1;

shimInit();

const fsDriver = new FsDriverNode();
Logger.fsDriver_ = fsDriver;
Resource.fsDriver_ = fsDriver;
EncryptionService.fsDriver_ = fsDriver;
FileApiDriverLocal.fsDriver_ = fsDriver;

const logDir = __dirname + '/../tests/logs';
fs.mkdirpSync(logDir, 0o755);

SyncTargetRegistry.addClass(SyncTargetMemory);
SyncTargetRegistry.addClass(SyncTargetFilesystem);
SyncTargetRegistry.addClass(SyncTargetOneDrive);
SyncTargetRegistry.addClass(SyncTargetNextcloud);

const syncTargetId_ = SyncTargetRegistry.nameToId('nextcloud');
//const syncTargetId_ = SyncTargetRegistry.nameToId('memory');
//const syncTargetId_ = SyncTargetRegistry.nameToId('filesystem');
const syncDir = __dirname + '/../tests/sync';

const sleepTime = syncTargetId_ == SyncTargetRegistry.nameToId('filesystem') ? 1001 : 10;//400;

console.info('Testing with sync target: ' + SyncTargetRegistry.idToName(syncTargetId_));

const logger = new Logger();
logger.addTarget('console');
logger.addTarget('file', { path: logDir + '/log.txt' });
logger.setLevel(Logger.LEVEL_WARN); // Set to INFO to display sync process in console

BaseItem.loadClass('Note', Note);
BaseItem.loadClass('Folder', Folder);
BaseItem.loadClass('Resource', Resource);
BaseItem.loadClass('Tag', Tag);
BaseItem.loadClass('NoteTag', NoteTag);
BaseItem.loadClass('MasterKey', MasterKey);

Setting.setConstant('appId', 'net.cozic.joplin-cli');
Setting.setConstant('appType', 'cli');

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
	await time.msleep(sleepTime); // Always leave a little time so that updated_time properties don't overlap
	await Setting.saveAll();

	currentClient_ = id;
	BaseModel.db_ = databases_[id];
	Folder.db_ = databases_[id];
	Note.db_ = databases_[id];
	BaseItem.db_ = databases_[id];
	Setting.db_ = databases_[id];

	BaseItem.encryptionService_ = encryptionServices_[id];
	Resource.encryptionService_ = encryptionServices_[id];

	Setting.setConstant('resourceDir', resourceDir(id));

	return Setting.load();
}

async function clearDatabase(id = null) {
	if (id === null) id = currentClient_;

	let queries = [
		'DELETE FROM notes',
		'DELETE FROM folders',
		'DELETE FROM resources',
		'DELETE FROM tags',
		'DELETE FROM note_tags',
		'DELETE FROM master_keys',
		'DELETE FROM settings',
		
		'DELETE FROM deleted_items',
		'DELETE FROM sync_items',
	];

	await databases_[id].transactionExecBatch(queries);
}

async function setupDatabase(id = null) {
	if (id === null) id = currentClient_;

	Setting.cancelScheduleSave();
	Setting.cache_ = null;

	if (databases_[id]) {
		await clearDatabase(id);
		await Setting.load();
		return;
	}

	const filePath = __dirname + '/data/test-' + id + '.sqlite';

	try {
		await fs.unlink(filePath);
	} catch (error) {
		// Don't care if the file doesn't exist
	};

	databases_[id] = new JoplinDatabase(new DatabaseDriverNode());
	await databases_[id].open({ name: filePath });

	BaseModel.db_ = databases_[id];
	await Setting.load();
}

function resourceDir(id = null) {
	if (id === null) id = currentClient_;
	return __dirname + '/data/resources-' + id;
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
	decryptionWorkers_[id] = new DecryptionWorker();
	decryptionWorkers_[id].setEncryptionService(encryptionServices_[id]);

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

function decryptionWorker(id = null) {
	if (id === null) id = currentClient_;
	return decryptionWorkers_[id];
}

async function loadEncryptionMasterKey(id = null, useExisting = false) {
	const service = encryptionService(id);

	let masterKey = null;

	if (!useExisting) { // Create it
		masterKey = await service.generateMasterKey('123456');
		masterKey = await MasterKey.save(masterKey);
	} else { // Use the one already available
		materKey = await MasterKey.all();
		if (!materKey.length) throw new Error('No mater key available');
		masterKey = materKey[0];
	}

	await service.loadMasterKey(masterKey, '123456', true);

	return masterKey;
}

function fileApi() {
	if (fileApi_) return fileApi_;

	if (syncTargetId_ == SyncTargetRegistry.nameToId('filesystem')) {
		fs.removeSync(syncDir)
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
	}

	// } else if (syncTargetId == Setting.SYNC_TARGET_ONEDRIVE) {
	// 	let auth = require('./onedrive-auth.json');
	// 	if (!auth) {
	// 		const oneDriveApiUtils = new OneDriveApiNodeUtils(oneDriveApi);
	// 		auth = await oneDriveApiUtils.oauthDance();
	// 		fs.writeFileSync('./onedrive-auth.json', JSON.stringify(auth));
	// 		process.exit(1);
	// 	} else {
	// 		auth = JSON.parse(auth);
	// 	}

	// 	// const oneDriveApiUtils = new OneDriveApiNodeUtils(reg.oneDriveApi());
	// 	// const auth = await oneDriveApiUtils.oauthDance(this);
	// 	// Setting.setValue('sync.3.auth', auth ? JSON.stringify(auth) : null);
	// 	// if (!auth) return;
	// }

	fileApi_.setLogger(logger);
	fileApi_.setSyncTargetId(syncTargetId_);
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
		}
		done();
	}
}

module.exports = { setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync, encryptionService, loadEncryptionMasterKey, fileContentEqual, decryptionWorker, asyncTest };