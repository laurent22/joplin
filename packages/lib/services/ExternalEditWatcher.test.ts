import { setupDatabaseAndSynchronizer, switchClient } from '../testing/test-utils';
import ExternalEditWatcher from './ExternalEditWatcher';
import { appendFile, readFile, utimes } from 'fs/promises';
import Note from '../models/Note';
import { msleep, Second } from '@joplin/utils/time';
import waitFor from '../testing/waitFor';
import { NoteEntity } from './database/types';

const createAndWatchNotes = async (notes: NoteEntity[]) => {
	const watcher = new ExternalEditWatcher();
	const openedPaths: string[] = [];
	watcher.initialize(jest.fn(() => ({
		openItem: (filePath: string)=>{
			openedPaths.push(filePath);
		},
	})), jest.fn());

	const savedNotes = [];
	for (const note of notes) {
		const savedNote = await Note.save(note);
		await watcher.openAndWatch(savedNote);
		savedNotes.push(savedNote);
	}

	expect(openedPaths).toHaveLength(savedNotes.length);

	return {
		notes: savedNotes,
		filePaths: openedPaths,
		watcher,
	};
};

const createAndWatchNote = async (note: NoteEntity) => {
	const { notes, filePaths, watcher } = await createAndWatchNotes([note]);

	return {
		note: notes[0],
		filePath: filePaths[0],
		watcher,
	};
};

describe('ExternalEditWatcher', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(0);
		await switchClient(0);
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

	test('should detect changes made to different files', async () => {
		const { filePaths, watcher, notes } = await createAndWatchNotes([
			{ title: 'Test 1', body: 'Test' },
			{ title: 'Test 2', body: 'Test' },
		]);

		try {
			await appendFile(filePaths[0], ' (updated 1)');
			await appendFile(filePaths[1], ' (updated 2)');

			await waitFor(async () => {
				expect(await Note.load(notes[0].id)).toMatchObject({
					title: 'Test 1',
					body: 'Test (updated 1)',
				});
				expect(await Note.load(notes[1].id)).toMatchObject({
					title: 'Test 2',
					body: 'Test (updated 2)',
				});
			});
		} finally {
			await watcher.stopWatchingAll();
		}
	});

	test('should ignore change events that don\'t change the note', async () => {
		const { filePaths, watcher, notes } = await createAndWatchNotes([
			{ title: 'Test', body: 'Initial content' },
		]);
		try {
			// Apply an edit and wait to ensure that the initial watcher events
			// have been processed.
			await appendFile(filePaths[0], ' (updated)');
			await waitFor(async () => {
				expect(await Note.load(notes[0].id)).toMatchObject({
					title: 'Test',
					body: 'Initial content (updated)',
				});
			});

			await Note.save({ id: notes[0].id, body: 'Out-of-sync' });
			expect(await readFile(filePaths[0], 'utf-8')).toContain('Initial content');

			// Updating the file without changing its content should not overwrite the new content
			// in the note:
			await utimes(filePaths[0], new Date().getTime() + Second, new Date().getTime() + Second);
			await msleep(500);
			expect(await Note.load(notes[0].id)).toMatchObject({ body: 'Out-of-sync' });
		} finally {
			await watcher.stopWatchingAll();
		}
	});
});
