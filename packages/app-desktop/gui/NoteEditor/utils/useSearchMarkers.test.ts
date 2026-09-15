import { runWithFakeTimers, setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import { act, renderHook, waitFor } from '@testing-library/react';
import useSearchMarkers from './useSearchMarkers';
import Note from '@joplin/lib/models/Note';
import SearchEngine from '@joplin/lib/services/search/SearchEngine';
import { Second } from '@joplin/utils/time';
import { setUpSemanticSearch, tearDownSemanticSearch, updateSearchIndex } from '@joplin/lib/testing/ai/semanticSearch';


describe('useSearchMarkers', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		await setUpSemanticSearch();
	});

	afterEach(async () => {
		await tearDownSemanticSearch();
	});

	it.each([
		{
			label: 'should return markers for semantic search results',
			noteBody: 'example example example example',
			searchQuery: 'examples example example example',
			expected: [{ type: 'text', value: 'example example example example' }],
		},
		{
			label: 'should exclude Markdown from keywords',
			noteBody: '*test-test-test-test*! test',
			// cSpell:disable
			searchQuery: 'testt-test-test-test',
			// cSpell:enable
			expected: [{ type: 'text', value: 'test-test-test-test' }],
		},
	])('should return keywords for semantic search matches: $label', async ({ noteBody, searchQuery, expected }) => {
		const note = await Note.save({ title: 'test', body: noteBody });
		await updateSearchIndex();

		await runWithFakeTimers(async () => {
			const searchResults = await SearchEngine.instance().search(searchQuery);
			const test = renderHook(() => useSearchMarkers({
				showLocalSearch: false,
				localSearchMarkerOptions: () => null,
				noteId: note.id,
				searchResults,
				searchId: '1',
				searches: [{ id: '1', query_pattern: searchQuery, query_type: 1, type_: -1, title: searchQuery }],
				highlightedWords: [],
				noteTitle: note.title,
			}));

			await act(() => jest.advanceTimersByTimeAsync(5 * Second));

			await waitFor(() => {
				const result = test.result.current;
				expect(result.keywords).toMatchObject(expected);
			}, { timeout: 30 * Second });
			test.unmount();
		});
	});

});
