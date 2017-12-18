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
const { FsDriverNode } = require('lib/fs-driver-node.js');
const { time } = require('lib/time-utils.js');
const { shimInit } = require('lib/shim-init-node.js');
const SyncTargetRegistry = require('lib/SyncTargetRegistry.js');
const SyncTargetMemory = require('lib/SyncTargetMemory.js');
const SyncTargetFilesystem = require('lib/SyncTargetFilesystem.js');
const SyncTargetOneDrive = require('lib/SyncTargetOneDrive.js');
const EncryptionService = require('lib/services/EncryptionService.js');

let databases_ = [];
let synchronizers_ = [];
let encryptionServices_ = [];
let fileApi_ = null;
let currentClient_ = 1;

shimInit();

const fsDriver = new FsDriverNode();
Logger.fsDriver_ = fsDriver;
Resource.fsDriver_ = fsDriver;
EncryptionService.fsDriver_ = fsDriver;

const logDir = __dirname + '/../tests/logs';
fs.mkdirpSync(logDir, 0o755);

SyncTargetRegistry.addClass(SyncTargetMemory);
SyncTargetRegistry.addClass(SyncTargetFilesystem);
SyncTargetRegistry.addClass(SyncTargetOneDrive);

const syncTargetId_ = SyncTargetRegistry.nameToId('memory');
const syncDir = __dirname + '/../tests/sync';

const sleepTime = syncTargetId_ == SyncTargetRegistry.nameToId('filesystem') ? 1001 : 400;

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

function clearDatabase(id = null) {
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

	return databases_[id].transactionExecBatch(queries);
}

function setupDatabase(id = null) {
	if (id === null) id = currentClient_;

	if (databases_[id]) {
		return clearDatabase(id).then(() => {
			return Setting.load();
		});
	}

	const filePath = __dirname + '/data/test-' + id + '.sqlite';
	// Setting.setConstant('resourceDir', RNFetchBlob.fs.dirs.DocumentDir);
	return fs.unlink(filePath).catch(() => {
		// Don't care if the file doesn't exist
	}).then(() => {
		databases_[id] = new JoplinDatabase(new DatabaseDriverNode());
		// databases_[id].setLogger(logger);
		// console.info(filePath);
		return databases_[id].open({ name: filePath }).then(() => {
			BaseModel.db_ = databases_[id];
			return setupDatabase(id);
		});
	});
}

function resourceDir(id = null) {
	if (id === null) id = currentClient_;
	return __dirname + '/data/resources-' + id;
}

async function setupDatabaseAndSynchronizer(id = null) {
	if (id === null) id = currentClient_;

	await setupDatabase(id);

	await fs.remove(resourceDir(id));
	await fs.mkdirp(resourceDir(id), 0o755);

	if (!synchronizers_[id]) {
		const SyncTargetClass = SyncTargetRegistry.classById(syncTargetId_);
		const syncTarget = new SyncTargetClass(db(id));
		syncTarget.setFileApi(fileApi());
		syncTarget.setLogger(logger);
		synchronizers_[id] = await syncTarget.synchronizer();
	}

	//if (!encryptionServices_[id]) {
		encryptionServices_[id] = new EncryptionService();
	//}

	if (syncTargetId_ == SyncTargetRegistry.nameToId('filesystem')) {
		fs.removeSync(syncDir)
		fs.mkdirpSync(syncDir, 0o755);
	} else {
		await fileApi().format();
	}
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

module.exports = { setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync, encryptionService, loadEncryptionMasterKey, fileContentEqual };