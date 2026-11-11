import * as React from 'react';
import TestProviderStack from './testing/TestProviderStack';
import NoteGrid, { getColumnCount } from './NoteGrid';
import { AppState } from '../utils/types';
import { Store } from 'redux';
import createMockReduxStore from '../utils/testing/createMockReduxStore';
import setupGlobalStore from '../utils/testing/setupGlobalStore';
import { render, screen, waitFor } from '../utils/testing/testingLibrary';
import { setupDatabaseAndSynchronizer } from '@joplin/lib/testing/test-utils';
import Folder from '@joplin/lib/models/Folder';
import Note from '@joplin/lib/models/Note';

let testStore: Store<AppState>;

describe('NoteGrid', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(0);
		testStore = createMockReduxStore();
		setupGlobalStore(testStore);
	});

	test.each([
		[360, 2],
		[600, 3],
		[900, 5],
		[100, 2],
	])('should compute the column count for a width of %d', (width, expected) => {
		expect(getColumnCount(width)).toBe(expected);
	});

	test('should display the title and a preview of each note', async () => {
		const folder = await Folder.save({ title: 'Test folder' });
		const note1 = await Note.save({ parent_id: folder.id, title: 'First note', body: '# Heading\n\nSome **body** text' });
		const note2 = await Note.save({ parent_id: folder.id, title: 'Second note', body: 'Other content' });
		const notes = await Note.previews(folder.id);

		render(<TestProviderStack store={testStore}>
			<NoteGrid items={notes} notesSource='test'/>
		</TestProviderStack>);

		expect(await screen.findByText(note1.title)).toBeVisible();
		expect(await screen.findByText(note2.title)).toBeVisible();
		await waitFor(() => expect(screen.getByText('Heading Some body text')).toBeVisible());
		expect(screen.getByText('Other content')).toBeVisible();
	});
});
