import * as React from 'react';
import { AppState } from '../../../utils/types';
import { Store } from 'redux';
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import createMockReduxStore from '../../../utils/testing/createMockReduxStore';
import setupGlobalStore from '../../../utils/testing/setupGlobalStore';
import Note from '@joplin/lib/models/Note';
import { render, screen } from '../../../utils/testing/testingLibrary';
import SearchResults, { limit } from './SearchResults';
import SearchEngine from '@joplin/lib/services/search/SearchEngine';
import Folder from '@joplin/lib/models/Folder';
import TestProviderStack from '../../testing/TestProviderStack';

const createNotes = async () => {
	const promises = [];
	const folder = await Folder.save({ title: 'Test Note' });
	for (let i = 0; i < limit + 1; i++) {
		promises.push(Note.save({ title: `abcd ${i}`, body: 'body', parent_id: folder.id }));
	}
	await Promise.all(promises);
	await SearchEngine.instance().syncTables();
};

let store: Store<AppState>;

describe('SearchResult', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		store = createMockReduxStore();
		setupGlobalStore(store);

	});

	test('should show message when the search results do not include all possible notes', async () => {
		await createNotes();
		await SearchEngine.instance().syncTables();
		render(<TestProviderStack store={store}>
			<SearchResults query='abcd' onHighlightedWordsChange={() => { }} ftsEnabled={1} />
		</TestProviderStack>);

		const notShowingEverythingAlert = await screen.findByText(`Only the first ${limit} results are being shown`);
		expect(notShowingEverythingAlert).toBeVisible();
	});

	test('should show all the items up until the limit', async () => {
		await createNotes();
		await SearchEngine.instance().syncTables();
		render(<TestProviderStack store={store}>
			<SearchResults query='abcd' onHighlightedWordsChange={() => { }} ftsEnabled={1} initialNumToRender={limit} />
		</TestProviderStack>);

		const items = await screen.findAllByText(/abcd \d\d?\d?/);
		expect(items.length).toBe(limit);
	});
});
