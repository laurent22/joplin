import { afterAllCleanUp, setupDatabaseAndSynchronizer, switchClient, syncTargetId, synchronizerStart, msleep } from '../testing/test-utils';
import BaseItem from './BaseItem';
import Note from './Note';

describe('BaseItem', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	afterAll(async () => {
		await afterAllCleanUp();
	});


	it('should update item sync item', async () => {
		const note1 = await Note.save({ });

		const syncTime = async (itemId: string) => {
			const syncItem = await BaseItem.syncItem(syncTargetId(), itemId, { fields: ['sync_time'] });
			return syncItem ? syncItem.sync_time : 0;
		};

		expect(await syncTime(note1.id)).toBe(0);

		await synchronizerStart();

		const newTime = await syncTime(note1.id);
		expect(newTime).toBeLessThanOrEqual(Date.now());

		// Check that it doesn't change if we sync again
		await msleep(1);
		await synchronizerStart();
		expect(await syncTime(note1.id)).toBe(newTime);
	});

});
