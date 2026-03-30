import { setupDatabaseAndSynchronizer } from '../testing/test-utils';
import ExternalEditWatcher from './ExternalEditWatcher';
import { appendFile } from 'fs/promises';
import Note from '../models/Note';
import { msleep } from '@joplin/utils/time';
import waitFor from '../testing/waitFor';

describe('ExternalEditWatcher', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(0);
		ExternalEditWatcher
			.instance()
			.initialize(jest.fn(), jest.fn());
		jest.useRealTimers();
	});

	test('should handle rapid changes to a file', async () => {
		const watcher = new ExternalEditWatcher();
		const openedItems: string[] = [];
		watcher.initialize(jest.fn(() => ({
			openItem: (filePath: string)=>{
				openedItems.push(filePath);
			},
		})), jest.fn());

		const note = await Note.save({ title: 'Testing', body: 'test' });
		await watcher.openAndWatch(note);

		const filePath = openedItems[0];
		expect(filePath).toBeTruthy();

		await appendFile(filePath, '...');
		// After a brief delay, change the note again.
		await msleep(20);
		await appendFile(filePath, '...');

		// Should detect both changes
		await waitFor(async () => {
			expect(await Note.load(note.id)).toMatchObject({
				title: 'Testing',
				body: 'test......',
			});
		});

		await watcher.stopWatchingAll();
	});
});
