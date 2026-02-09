import * as React from 'react';
import { AppState } from '../../../utils/types';
import { Store } from 'redux';
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import createMockReduxStore from '../../../utils/testing/createMockReduxStore';
import setupGlobalStore from '../../../utils/testing/setupGlobalStore';
import Note from '@joplin/lib/models/Note';
import { render, screen } from '../../../utils/testing/testingLibrary';
import SearchResults from './SearchResults';
import SearchEngine from '@joplin/lib/services/search/SearchEngine';
import Folder from '@joplin/lib/models/Folder';
import TestProviderStack from '../../testing/TestProviderStack';

const createNotes = async (count: number) => {
	const folder = await Folder.save({ title: 'Test Note' });
	for (let i = 0; i < count; i++) {
		await Note.save({ title: `abcd ${i}`, body: 'body', parent_id: folder.id });
	}
	await SearchEngine.instance().syncTables();
};

let store: Store<AppState>;

interface WrapperProps {
	query: string;
	paused: boolean;
}
const WrappedSearchResults: React.FC<WrapperProps> = props => (
	<TestProviderStack store={store}>
		<SearchResults paused={props.paused} query={props.query} onHighlightedWordsChange={() => { }} ftsEnabled={1} />
	</TestProviderStack>
);

describe('SearchResult', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		store = createMockReduxStore();
		setupGlobalStore(store);
	});

	test('should show results when unpaused', async () => {
		const noteCount = 8;
		await createNotes(noteCount);

		render(<WrappedSearchResults query='abcd' paused={false}/>);
		const items = await screen.findAllByText(/abcd \d\d?\d?/);
		expect(items.length).toBe(noteCount);
	});
});
