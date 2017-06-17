import fs from 'fs-extra';
import { Database } from 'src/database.js';
import { DatabaseDriverNode } from 'src/database-driver-node.js';
import { BaseModel } from 'src/base-model.js';
import { Synchronizer } from 'src/synchronizer.js';
import { FileApi } from 'src/file-api.js';
import { FileApiDriverMemory } from 'src/file-api-driver-memory.js';

let database_ = null;
let synchronizer_ = null;
let fileApi_ = null;

function setupDatabase(done) {
	if (database_) {
		let queries = [
			'DELETE FROM changes',
			'DELETE FROM notes',
			'DELETE FROM folders',
			'DELETE FROM item_sync_times',
		];

		return database_.transactionExecBatch(queries).then(() => {
			if (done) done();
		});
	}

	const filePath = __dirname + '/data/test.sqlite';
	return fs.unlink(filePath).catch(() => {
		// Don't care if the file doesn't exist
	}).then(() => {
		database_ = new Database(new DatabaseDriverNode());
		database_.setDebugEnabled(false);
		return database_.open({ name: filePath }).then(() => {
			BaseModel.db_ = database_;
			return setupDatabase(done);
		});
	});
}

async function setupDatabaseAndSynchronizer() {
	await setupDatabase();

	if (!synchronizer_) {
		let fileDriver = new FileApiDriverMemory();
		fileApi_ = new FileApi('/root', fileDriver);
		synchronizer_ = new Synchronizer(db(), fileApi_);
	}
}

function db() {
	return database_;
}

function synchronizer() {
	return synchronizer_;
}

function fileApi() {
	return fileApi_;
}

export { setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi };