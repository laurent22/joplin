import fs from 'fs-extra';
import { Database } from 'lib/database.js';
import { DatabaseDriverNode } from 'lib/database-driver-node.js';
import { BaseModel } from 'lib/base-model.js';
import { Folder } from 'lib/models/folder.js';
import { Note } from 'lib/models/note.js';
import { Logger } from 'lib/logger.js';
import { Setting } from 'lib/models/setting.js';
import { BaseItem } from 'lib/models/base-item.js';
import { Synchronizer } from 'lib/synchronizer.js';
import { FileApi } from 'lib/file-api.js';
import { FileApiDriverMemory } from 'lib/file-api-driver-memory.js';
import { time } from 'lib/time-utils.js';

let databases_ = [];
let synchronizers_ = [];
let fileApi_ = null;
let currentClient_ = 1;

const logger = new Logger();
logger.addTarget('file', { path: __dirname + '/data/log-test.txt' });
//logger.addTarget('console');
logger.setLevel(Logger.LEVEL_DEBUG);

function sleep(n) {
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			resolve();
		}, Math.round(n * 1000));
	});
}

async function switchClient(id) {
	await time.msleep(200); // Always leave a little time so that updated_time properties don't overlap
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
		databases_[id] = new Database(new DatabaseDriverNode());
		databases_[id].setLogger(logger);
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
		synchronizers_[id] = new Synchronizer(db(id), fileApi());
		synchronizers_[id].setLogger(logger);
	}

	await fileApi().format();
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

	fileApi_ = new FileApi('/root', new FileApiDriverMemory());
	fileApi_.setLogger(logger);
	return fileApi_;
}

export { setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient };