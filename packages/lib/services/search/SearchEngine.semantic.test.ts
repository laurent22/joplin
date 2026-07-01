import Note from '../../models/Note';
import { db, setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import AiService from '../ai/AiService';
import EmbeddingIndexer from '../ai/EmbeddingIndexer';
import TestEmbeddingProvider from '../ai/testing/TestEmbeddingProvider';
import SearchEngine, { SearchType } from './SearchEngine';

describe('SearchEngine.semantic', () => {
	let engine: SearchEngine = null;

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);

		engine = new SearchEngine();
		engine.setDb(db());

		const provider = new TestEmbeddingProvider();
		AiService.instance().setEmbeddingProvider(provider);
	});

	afterEach(async () => {
		AiService.instance().setEmbeddingProvider(null);
		await EmbeddingIndexer.instance().stopRunInBackground();
	});

	it('should fall back to semantic search when there are no FTS results', async () => {
		await Note.save({ title: 'test', body: 'letter letter letter letter' });

		await EmbeddingIndexer.instance().maintenance();
		await engine.syncTables();

		const ftsRows = await engine.search('letters', { searchType: SearchType.Fts });
		expect(ftsRows).toHaveLength(0);

		const rows = await engine.search('letters');
		expect(rows).toHaveLength(1);
	});

	it('should not use semantic search when the user has specified a field to search in', async () => {
		await Note.save({ title: 'test', body: 'letter letter letter body:letter' });

		await EmbeddingIndexer.instance().maintenance();
		await engine.syncTables();

		const rows = await engine.search('body:letters');
		expect(rows).toHaveLength(0);
	});
});
