import { setupDatabaseAndSynchronizer, db, switchClient } from './test-utils.js';
import SearchEngine from '@joplin/lib/services/searchengine/SearchEngine';
import SearchEngineUtils from '@joplin/lib/services/searchengine/SearchEngineUtils';
import Setting from '@joplin/lib/models/Setting';
const Note = require('@joplin/lib/models/Note').default;


let searchEngine: any = null;

describe('services_SearchEngineUtils', function() {
	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		searchEngine = new SearchEngine();
		searchEngine.setDb(db());
		done();
	});

	describe('filter todos based on showCompletedTodos', function() {
		it('show completed', (async () => {
			const note1 = await Note.save({ title: 'abcd', body: 'body 1' });
			const todo1 = await Note.save({ title: 'abcd', body: 'todo 1', is_todo: 1 });
			const todo2 = await Note.save({ title: 'abcd', body: 'todo 2', is_todo: 1, todo_completed: 1590085027710 });
			await Note.save({ title: 'qwer', body: 'body 2' });
			await searchEngine.syncTables();

			Setting.setValue('showCompletedTodos', true);

			const rows = await SearchEngineUtils.notesForQuery('abcd', null, searchEngine);

			expect(rows.length).toBe(3);
			expect(rows.map(r=>r.id)).toContain(note1.id);
			expect(rows.map(r=>r.id)).toContain(todo1.id);
			expect(rows.map(r=>r.id)).toContain(todo2.id);
		}));

		it('hide completed', (async () => {
			const note1 = await Note.save({ title: 'abcd', body: 'body 1' });
			const todo1 = await Note.save({ title: 'abcd', body: 'todo 1', is_todo: 1 });
			await Note.save({ title: 'qwer', body: 'body 2' });
			await Note.save({ title: 'abcd', body: 'todo 2', is_todo: 1, todo_completed: 1590085027710 });
			await searchEngine.syncTables();

			Setting.setValue('showCompletedTodos', false);

			const rows = await SearchEngineUtils.notesForQuery('abcd', null, searchEngine);

			expect(rows.length).toBe(2);
			expect(rows.map(r=>r.id)).toContain(note1.id);
			expect(rows.map(r=>r.id)).toContain(todo1.id);
		}));
	});
});
