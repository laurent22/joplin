import { afterAllCleanUp, synchronizerStart, setupDatabaseAndSynchronizer, switchClient } from './test-utils';
import Note from '@joplin/lib/models/Note';
import BaseItem from '@joplin/lib/models/BaseItem';
import shim from '@joplin/lib/shim';
import Resource from '@joplin/lib/models/Resource';

describe('Synchronizer.sharing', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await setupDatabaseAndSynchronizer(2);
		await switchClient(1);
		done();
	});

	afterAll(async () => {
		await afterAllCleanUp();
	});

	it('should mark link resources as shared before syncing', (async () => {
		let note1 = await Note.save({ title: 'note1' });
		note1 = await shim.attachFileToNote(note1, `${__dirname}/../tests/support/photo.jpg`);
		const resourceId1 = (await Note.linkedResourceIds(note1.body))[0];

		const note2 = await Note.save({ title: 'note2' });
		await shim.attachFileToNote(note2, `${__dirname}/../tests/support/photo.jpg`);

		expect((await Resource.sharedResourceIds()).length).toBe(0);

		await BaseItem.updateShareStatus(note1, true);

		await synchronizerStart();

		const sharedResourceIds = await Resource.sharedResourceIds();
		expect(sharedResourceIds.length).toBe(1);
		expect(sharedResourceIds[0]).toBe(resourceId1);
	}));

});
