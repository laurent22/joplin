const fs = require('fs-extra');
const { JoplinDatabase } = require('lib/joplin-database.js');
const { DatabaseDriverNode } = require('lib/database-driver-node.js');
const { BaseModel } = require('lib/base-model.js');
const { Folder } = require('lib/models/folder.js');
const { Note } = require('lib/models/note.js');
const { Resource } = require('lib/models/resource.js');
const { Tag } = require('lib/models/tag.js');
const { NoteTag } = require('lib/models/note-tag.js');
const { Logger } = require('lib/logger.js');
const { Setting } = require('lib/models/setting.js');
const { BaseItem } = require('lib/models/base-item.js');
const { Synchronizer } = require('lib/synchronizer.js');
const { FileApi } = require('lib/file-api.js');
const { FileApiDriverMemory } = require('lib/file-api-driver-memory.js');
const { FileApiDriverLocal } = require('lib/file-api-driver-local.js');
const { FsDriverNode } = require('lib/fs-driver-node.js');
const { time } = require('lib/time-utils.js');
const SyncTargetRegistry = require('lib/SyncTargetRegistry.js');
const SyncTarget1 = require('lib/SyncTarget1.js');
const SyncTarget2 = require('lib/SyncTarget2.js');

let databases_ = [];
let synchronizers_ = [];
let fileApi_ = null;
let currentClient_ = 1;

const fsDriver = new FsDriverNode();
Logger.fsDriver_ = fsDriver;
Resource.fsDriver_ = fsDriver;

const logDir = __dirname + '/../tests/logs';
fs.mkdirpSync(logDir, 0o755);

const syncTargetId_ = Setting.SYNC_TARGET_MEMORY;
const syncDir = __dirname + '/../tests/sync';

const sleepTime = syncTargetId_ == Setting.SYNC_TARGET_FILESYSTEM ? 1001 : 400;

const logger = new Logger();
logger.addTarget('file', { path: logDir + '/log.txt' });
logger.setLevel(Logger.LEVEL_DEBUG);

BaseItem.loadClass('Note', Note);
BaseItem.loadClass('Folder', Folder);
BaseItem.loadClass('Resource', Resource);
BaseItem.loadClass('Tag', Tag);
BaseItem.loadClass('NoteTag', NoteTag);

Setting.setConstant('appId', 'net.cozic.joplin-cli');
Setting.setConstant('appType', 'cli');

SyncTargetRegistry.addClass(SyncTarget1);
SyncTargetRegistry.addClass(SyncTarget2);

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

async function setupDatabaseAndSynchronizer(id = null) {
	if (id === null) id = currentClient_;

	await setupDatabase(id);

	if (!synchronizers_[id]) {
		const SyncTargetClass = SyncTargetRegistry.classById(syncTargetId_);
		const syncTarget = new SyncTargetClass(db(id));
		syncTarget.setFileApi(fileApi());
		syncTarget.setLogger(logger);
		synchronizers_[id] = await syncTarget.synchronizer();
	}

	if (syncTargetId_ == Setting.SYNC_TARGET_FILESYSTEM) {
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

function fileApi() {
	if (fileApi_) return fileApi_;

	if (syncTargetId_ == Setting.SYNC_TARGET_FILESYSTEM) {
		fs.removeSync(syncDir)
		fs.mkdirpSync(syncDir, 0o755);
		fileApi_ = new FileApi(syncDir, new FileApiDriverLocal());
	} else if (syncTargetId_ == Setting.SYNC_TARGET_MEMORY) {
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

module.exports = { setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId };