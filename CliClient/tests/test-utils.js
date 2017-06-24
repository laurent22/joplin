import fs from 'fs-extra';
import { Database } from 'src/database.js';
import { DatabaseDriverNode } from 'src/database-driver-node.js';
import { BaseModel } from 'src/base-model.js';
import { Folder } from 'src/models/folder.js';
import { Note } from 'src/models/note.js';
import { Setting } from 'src/models/setting.js';
import { BaseItem } from 'src/models/base-item.js';
import { Synchronizer } from 'src/synchronizer.js';
import { FileApi } from 'src/file-api.js';
import { FileApiDriverMemory } from 'src/file-api-driver-memory.js';

let databases_ = [];
let synchronizers_ = [];
let fileApi_ = null;
let currentClient_ = 1;

function sleep(n) {
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			resolve();
		}, Math.round(n * 1000));
	});
}

function switchClient(id) {
	Setting.saveAll();

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
		'DELETE FROM changes',
		'DELETE FROM notes',
		'DELETE FROM folders',
		'DELETE FROM item_sync_times',
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
		databases_[id].setDebugMode(false);
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
	}

	await fileApi().format();
}

function db(id = null) {
	if (id === null) id = currentClient_;
	return databases_[id];
}

function synchronizer(id = null) {
	if (id === null) id = currentClient_;
	//console.info('SYNC', id);
	return synchronizers_[id];
}

function fileApi() {
	if (fileApi_) return fileApi_;

	fileApi_ = new FileApi('/root', new FileApiDriverMemory());
	return fileApi_;
}

export { setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient };