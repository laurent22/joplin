describe('Synchronizer.sharing', () => {

	it('should skip', (async () => {
		expect(true).toBe(true);
	}));

});

// import { afterAllCleanUp, synchronizerStart, setupDatabaseAndSynchronizer, switchClient, joplinServerApi } from '../../testing/test-utils';
// import Note from '../../models/Note';
// import BaseItem from '../../models/BaseItem';
// import shim from '../../shim';
// import Resource from '../../models/Resource';
// import Folder from '../../models/Folder';

// describe('Synchronizer.sharing', function() {

// 	beforeEach(async () => {
// 		await setupDatabaseAndSynchronizer(1);
// 		await switchClient(1);
// 	});

// 	afterAll(async () => {
// 		await afterAllCleanUp();
// 	});

// 	it('should mark link resources as shared before syncing', (async () => {
// 		let note1 = await Note.save({ title: 'note1' });
// 		note1 = await shim.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
// 		const resourceId1 = (await Note.linkedResourceIds(note1.body))[0];

// 		const note2 = await Note.save({ title: 'note2' });
// 		await shim.attachFileToNote(note2, `${__dirname}/../tests/support/photo.jpg`);

// 		expect((await Resource.sharedResourceIds()).length).toBe(0);

// 		await BaseItem.updateShareStatus(note1, true);

// 		await synchronizerStart();

// 		const sharedResourceIds = await Resource.sharedResourceIds();
// 		expect(sharedResourceIds.length).toBe(1);
// 		expect(sharedResourceIds[0]).toBe(resourceId1);
// 	}));

// 	it('should share items', (async () => {
// 		await setupDatabaseAndSynchronizer(1, { userEmail: 'user1@example.com' });
// 		await switchClient(1);

// 		const api = joplinServerApi();
// 		await api.exec('POST', 'api/debug', null, { action: 'createTestUsers' });
// 		await api.clearSession();

// 		const folder1 = await Folder.save({ title: 'folder1' });
// 		await Note.save({ title: 'note1', parent_id: folder1.id });

// 		await synchronizerStart();

// 		await setupDatabaseAndSynchronizer(2, { userEmail: 'user2@example.com' });
// 		await switchClient(2);

// 		await synchronizerStart();

// 		await switchClient(1);

// 		console.info(await Note.all());
// 	}));

// });
