import Note from '../../models/Note';
import { setUpSemanticSearch, tearDownSemanticSearch, updateSearchIndex } from '../../testing/ai/semanticSearch';
import { setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import SearchEngine from './SearchEngine';

describe('SearchEngine.semantic', () => {
	let engine: SearchEngine = null;

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);

		await setUpSemanticSearch();
		engine = SearchEngine.instance();
	});

	afterEach(async () => {
		await tearDownSemanticSearch();
	});

	it('should include semantic results in general search output', async () => {
		await Note.save({ title: 'test', body: 'letter letter letter letter' });

		await updateSearchIndex();

		const rows = await engine.search('letters');
		expect(rows).toHaveLength(1);
	});

	it('should not use semantic search when the user has specified a field to search in', async () => {
		await Note.save({ title: 'test', body: 'letter letter letter body:letter' });

		await updateSearchIndex();

		const rows = await engine.search('body:letters');
		expect(rows).toHaveLength(0);
	});
});
