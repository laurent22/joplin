import Note from '../../../models/Note';
import Api, { RequestMethod } from '../Api';
import { switchClient, db, setupDatabase } from '../../../testing/test-utils';
import SearchEngine from '../../search/SearchEngine';
import ItemChange from '../../../models/ItemChange';
import { NoteEntity } from '../../database/types';

let searchEngineInstance: SearchEngine = null;

describe('routes/search', () => {

	beforeEach(async () => {
		await setupDatabase(1);
		await switchClient(1);
	});

	it('should be able to get all notes with pagination', async () => {
		const api = new Api();
		const promises = [];
		for (let i = 0; i < 101; i++) {
			promises.push(Note.save({ title: `abcd ${i}`, body: 'body' }));
		}
		await Promise.all(promises);
		searchEngineInstance = SearchEngine.instance();
		searchEngineInstance.setDb(db());
		await searchEngineInstance.syncTables();
		await ItemChange.waitForAllSaved();

		const result = await api.route(RequestMethod.GET, 'search', { query: 'abcd', limit: 100 });
		const result2 = await api.route(RequestMethod.GET, 'search', { query: 'abcd', limit: 100, page: 2 });

		const allIds = result.items.map((n: Partial<NoteEntity>) => n.id).concat(result2.items.map((n: Partial<NoteEntity>) => n.id));
		const uniqueIds = Array.from(new Set(allIds));

		expect(uniqueIds.length).toBe(101);
	});

	it('should allow to set limit to pagination without affecting the search query', async () => {
		const api = new Api();
		const promises = [];
		for (let i = 0; i < 101; i++) {
			promises.push(Note.save({ title: `abcd ${i}`, body: 'body' }));
		}
		await Promise.all(promises);
		searchEngineInstance = SearchEngine.instance();
		searchEngineInstance.setDb(db());
		await searchEngineInstance.syncTables();
		await ItemChange.waitForAllSaved();

		const result = [];
		let page = 1;
		while (true) {
			const r = await api.route(RequestMethod.GET, 'search', { query: 'abcd', limit: 10, page: page });
			result.push(...r.items);
			if (!r.has_more) break;
			page += 1;

			if (page > 11) {
				throw new Error('Too many pages returned');
			}
		}

		expect(result.length).toBe(101);
	});

});
