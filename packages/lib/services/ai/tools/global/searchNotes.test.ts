import Note from '../../../../models/Note';
import { db, setupDatabaseAndSynchronizer, switchClient } from '../../../../testing/test-utils';
import SearchEngine from '../../../search/SearchEngine';
import SearchEngineUtils from '../../../search/SearchEngineUtils';
import searchNotes from './searchNotes';

interface SearchOutput {
	results: { id: string; snippet: string }[];
	total: number;
}

const runSearch = async (limit = 20) => await searchNotes.handler({ query: 'keyword', limit }, {}) as SearchOutput;

describe('search_notes', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		SearchEngine.instance().setDb(db());
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	const createNotes = async () => {
		const notes = [];
		for (const [title, body] of [['Other', 'keyword once'], ['keyword', 'keyword keyword repeated'], ['Last', 'keyword last']]) {
			notes.push(await Note.save({ id: String(notes.length + 1).padStart(32, '0'), title, body }));
		}
		await SearchEngine.instance().syncTables();
		return notes;
	};

	test('preserves ranking and matches snippets to bodies returned in a different order', async () => {
		const notes = await createNotes();
		const ranked = (await SearchEngineUtils.notesForQuery('keyword', false, { fields: ['id'] })).notes;
		expect(ranked.map(n => n.id)).not.toEqual(notes.map(n => n.id));
		expect(ranked.map(n => n.id)).not.toEqual(notes.map(n => n.id).sort());
		const byIds = Note.byIds.bind(Note);
		jest.spyOn(Note, 'byIds').mockImplementation(async (ids, options) => {
			const rows = await byIds(ids, options);
			return ids.slice().reverse().map(id => rows.find(n => n.id === id));
		});
		const output = await runSearch();
		expect(output.results.map(n => n.id)).toEqual(ranked.map(n => n.id));
		for (const result of output.results) {
			expect(result.snippet).toBe(notes.find(n => n.id === result.id).body);
		}
	});

	test('limits results while keeping the full match count', async () => {
		await createNotes();
		const output = await runSearch(1);
		expect(output.results).toHaveLength(1);
		expect(output.total).toBe(3);
	});

	test('fetches bodies only for the limited results and handles a missing body', async () => {
		await createNotes();
		const querySpy = jest.spyOn(SearchEngineUtils, 'notesForQuery');
		const bodySpy = jest.spyOn(Note, 'byIds').mockResolvedValue([]);
		const output = await runSearch(1);
		expect(querySpy.mock.calls[0][2].fields).not.toContain('body');
		expect(bodySpy).toHaveBeenCalledWith([output.results[0].id], { fields: ['id', 'body'] });
		expect(output.results[0].snippet).toBe('');
		expect(output.total).toBe(3);
	});
});
