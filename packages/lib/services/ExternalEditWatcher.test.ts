import { setupDatabaseAndSynchronizer } from '../testing/test-utils';
import ExternalEditWatcher from './ExternalEditWatcher';
import { appendFile } from 'fs/promises';
import Note from '../models/Note';
import { msleep } from '@joplin/utils/time';
import waitFor from '../testing/waitFor';
import { NoteEntity } from './database/types';

const createAndWatchNote = async (note: NoteEntity) => {
	const watcher = new ExternalEditWatcher();
	const openedItems: string[] = [];
	watcher.initialize(jest.fn(() => ({
		openItem: (filePath: string)=>{
			openedItems.push(filePath);
		},
	})), jest.fn());

	note = await Note.save(note);
	await watcher.openAndWatch(note);

	const filePath = openedItems[0];
	expect(filePath).toBeTruthy();

	return { note, watcher, filePath };
};

describe('ExternalEditWatcher', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(0);
		jest.useRealTimers();
	});

	test('should handle rapid changes to a file', async () => {
		const { filePath, watcher, note } = await createAndWatchNote({
			title: 'Testing',
			body: 'test',
		});

		try {
			await appendFile(filePath, '1');
			// Change the note several times, with a brief delay between each:
			await msleep(10);
			await appendFile(filePath, '2');
			await msleep(10);
			await appendFile(filePath, '3');
			await msleep(10);
			await appendFile(filePath, '4');

			// Should detect both changes
			await waitFor(async () => {
				expect(await Note.load(note.id)).toMatchObject({
					title: 'Testing',
					body: 'test1234',
				});
			});
		} finally {
			await watcher.stopWatchingAll();
		}
	});

	test('should detect a change made just before watching stops', async () => {
		const { filePath, watcher, note } = await createAndWatchNote({
			title: 'Testing', body: 'Test',
		});

		await appendFile(filePath, '!');
		await appendFile(filePath, '!!');
		await watcher.stopWatchingAll();

		await waitFor(async () => {
			expect(await Note.load(note.id)).toMatchObject({
				title: 'Testing',
				body: 'Test!!!',
			});
		});
	});
});
