import { promiseChain } from 'lib/promise-utils.js';
import { NoteFolderService } from 'lib/services/note-folder-service.js';
import { setupDatabaseAndSynchronizer } from 'test-utils.js';
import { createFoldersAndNotes } from 'test-data.js';

describe('NoteFolderServices', function() {

	beforeEach(function(done) {
		setupDatabaseAndSynchronizer(done);
	});

	it('should retrieve sync items', function(done) {
		createFoldersAndNotes().then(() => {
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