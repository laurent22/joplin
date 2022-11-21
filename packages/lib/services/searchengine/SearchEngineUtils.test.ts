import { setupDatabaseAndSynchronizer, db, switchClient } from '../../testing/test-utils.js';
import SearchEngine from '../../services/searchengine/SearchEngine';
import SearchEngineUtils from '../../services/searchengine/SearchEngineUtils';
import Setting from '../../models/Setting';
const Note = require('../../models/Note').default;


let searchEngine: any = null;

describe('services_SearchEngineUtils', function() {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		searchEngine = new SearchEngine();
		searchEngine.setDb(db());
	});

	describe('filter todos based on showCompletedTodos', function() {
		it('show completed', (async () => {
			const note1 = await Note.save({ title: 'abcd', body: 'body 1' });
			const todo1 = await Note.save({ title: 'abcd', body: 'todo 1', is_todo: 1 });
			const todo2 = await Note.save({ title: 'abcd', body: 'todo 2', is_todo: 1, todo_completed: 1590085027710 });
			await Note.save({ title: 'qwer', body: 'body 2' });
			await searchEngine.syncTables();

			Setting.setValue('showCompletedTodos', true);

			const rows = await SearchEngineUtils.notesForQuery('abcd', true, null, searchEngine);

			expect(rows.length).toBe(3);
			expect(rows.map(r=>r.id)).toContain(note1.id);
			expect(rows.map(r=>r.id)).toContain(todo1.id);
			expect(rows.map(r=>r.id)).toContain(todo2.id);

			const options: any = {};
			options.fields = ['id', 'title'];

			const rows2 = await SearchEngineUtils.notesForQuery('abcd', true, options, searchEngine);
			expect(rows2.length).toBe(3);
			expect(rows2.map(r=>r.id)).toContain(note1.id);
			expect(rows2.map(r=>r.id)).toContain(todo1.id);
			expect(rows2.map(r=>r.id)).toContain(todo2.id);
		}));

		it('hide completed', (async () => {
			const note1 = await Note.save({ title: 'abcd', body: 'body 1' });
			const todo1 = await Note.save({ title: 'abcd', body: 'todo 1', is_todo: 1 });
			await Note.save({ title: 'qwer', body: 'body 2' });
			await Note.save({ title: 'abcd', body: 'todo 2', is_todo: 1, todo_completed: 1590085027710 });
			await searchEngine.syncTables();

			Setting.setValue('showCompletedTodos', false);

			const rows = await SearchEngineUtils.notesForQuery('abcd', true, null, searchEngine);

			expect(rows.length).toBe(2);
			expect(rows.map(r=>r.id)).toContain(note1.id);
			expect(rows.map(r=>r.id)).toContain(todo1.id);

			const options: any = {};
			options.fields = ['id', 'title'];
			const rows2 = await SearchEngineUtils.notesForQuery('abcd', true, options, searchEngine);
			expect(rows2.length).toBe(2);
			expect(rows2.map(r=>r.id)).toContain(note1.id);
			expect(rows2.map(r=>r.id)).toContain(todo1.id);
		}));

		it('show completed (!applyUserSettings)', (async () => {
			const note1 = await Note.save({ title: 'abcd', body: 'body 1' });
			const todo1 = await Note.save({ title: 'abcd', body: 'todo 1', is_todo: 1 });
			await Note.save({ title: 'qwer', body: 'body 2' });
			const todo2 = await Note.save({ title: 'abcd', body: 'todo 2', is_todo: 1, todo_completed: 1590085027710 });
			await searchEngine.syncTables();

			Setting.setValue('showCompletedTodos', false);

			const rows = await SearchEngineUtils.notesForQuery('abcd', false, null, searchEngine);

			expect(rows.length).toBe(3);
			expect(rows.map(r=>r.id)).toContain(note1.id);
			expect(rows.map(r=>r.id)).toContain(todo1.id);
			expect(rows.map(r=>r.id)).toContain(todo2.id);
		}));
	});

	it('remove auto added fields', (async () => {
		await Note.save({ title: 'abcd', body: 'body 1' });
		await searchEngine.syncTables();

		const testCases = [
			['title', 'todo_due'],
			['title', 'todo_completed'],
			['title'],
			['title', 'todo_completed', 'todo_due'],
		];

		for (const testCase of testCases) {
			const rows = await SearchEngineUtils.notesForQuery('abcd', false, { fields: [...testCase] }, searchEngine);
			testCase.push('type_');
			expect(Object.keys(rows[0]).length).toBe(testCase.length);
			for (const field of testCase) {
				expect(rows[0]).toHaveProperty(field);
			}
		}
	}));
});
