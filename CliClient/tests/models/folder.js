import { time } from 'lib/time-utils.js';
import { setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient } from 'test-utils.js';
import { createFoldersAndNotes } from 'test-data.js';
import { Folder } from 'lib/models/folder.js';
import { Note } from 'lib/models/note.js';
import { Setting } from 'lib/models/setting.js';
import { BaseItem } from 'lib/models/base-item.js';
import { BaseModel } from 'lib/base-model.js';

process.on('unhandledRejection', (reason, p) => {
	console.error('Unhandled promise rejection at: Promise', p, 'reason:', reason);
});

async function thereIsOnlyOneDefaultFolder() {
	let count = 0;
	let folders = await Folder.all();
	for (let i = 0; i < folders.length; i++) {
		if (!!folders[i].is_default) count++;
	}
	return count === 1;
}

describe('Folder', function() {

	beforeEach( async (done) => {
		await setupDatabase(1);
		switchClient(1);
		done();
	});

	it('should have one default folder only', async (done) => {
		let f1 = await Folder.save({ title: 'folder1', is_default: 1 });
		let f2 = await Folder.save({ title: 'folder2' });
		let f3 = await Folder.save({ title: 'folder3' });

		await Folder.save({ id: f2.id, is_default: 1 });
		f2 = await Folder.load(f2.id);

		expect(f2.is_default).toBe(1);

		let r = await thereIsOnlyOneDefaultFolder();		
		expect(r).toBe(true);

		await Folder.save({ id: f2.id, is_default: 0 });
		f2 = await Folder.load(f2.id);

		expect(f2.is_default).toBe(1);

		done();
	});
	
});