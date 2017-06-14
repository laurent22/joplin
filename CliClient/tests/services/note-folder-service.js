import { time } from 'src/time-utils.js';
import { Note } from 'src/models/note.js';
import { Folder } from 'src/models/folder.js';
import { promiseChain } from 'src/promise-chain.js';
import { NoteFolderService } from 'src/services/note-folder-service.js';
import { setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi } from 'test-utils.js';

describe('NoteFolderServices', function() {

	beforeEach(function(done) {
		setupDatabaseAndSynchronizer(done);
	});

	function createNotes(parentId, id = 1) {
		let notes = [];
		if (id === 1) {
			notes.push({ parent_id: parentId, title: 'note one', body: 'content of note one' });
			notes.push({ parent_id: parentId, title: 'note two', body: 'content of note two' });
		} else {
			throw new Error('Invalid ID: ' + id);
		}

		let output = [];
		let chain = [];
		for (let i = 0; i < notes.length; i++) {
			chain.push(() => {
				return Note.save(notes[i]).then((note) => {
					output.push(note);
					return output;
				});
			});
		}

		return promiseChain(chain, []);
	}

	function createFolders(id = 1) {
		let folders = [];
		if (id === 1) {
			folders.push({ title: 'myfolder1' });
			folders.push({ title: 'myfolder2' });
			folders.push({ title: 'myfolder3' });
		} else {
			throw new Error('Invalid ID: ' + id);
		}

		let output = [];
		let chain = [];
		for (let i = 0; i < folders.length; i++) {
			chain.push(() => {
				return Folder.save(folders[i]).then((folder) => {
					output.push(folder);
					return output;
				});
			});
		}

		return promiseChain(chain, []);
	}

	it('should retrieve sync items', function(done) {
		createFolders().then((folders) => {
			return createNotes(folders[0].id);
		}).then(() => {
			return NoteFolderService.itemsThatNeedSync().then((context) => {
				expect(context.items.length).toBe(2);
				expect(context.hasMore).toBe(true);
				return context;
			});
		}).then((context) => {
			return NoteFolderService.itemsThatNeedSync(context, 2).then((context) => {
				expect(context.items.length).toBe(2);
				expect(context.hasMore).toBe(true);
				return context;
			});
		}).then((context) => {
			return NoteFolderService.itemsThatNeedSync(context, 2).then((context) => {
				expect(context.items.length).toBe(1);
				expect(context.hasMore).toBe(false);
				return context;
			});
		}).then(() => {
			done();
		}).catch((error) => {
			console.error(error);
		});
	});

});