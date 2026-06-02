import * as convertHtmlToMarkdown from './convertNoteToMarkdown';
import { defaultState, State } from '../reducer';
import Note from '../models/Note';
import { MarkupLanguage } from '@joplin/renderer';
import { db, setupDatabaseAndSynchronizer, switchClient } from '../testing/test-utils';
import Folder from '../models/Folder';
import { NoteEntity } from '../services/database/types';
import shim from '../shim';
import SearchEngine from '../services/search/SearchEngine';
import SearchEngineUtils from '../services/search/SearchEngineUtils';
import { getTrashFolderId } from '../services/trash';

describe('convertNoteToMarkdown', () => {
	let state: State = undefined;

	beforeEach(async () => {
		state = defaultState;
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		shim.showToast = jest.fn();
	});

	it('should keep the original note active and trash an HTML backup', async () => {
		const folder = await Folder.save({ title: 'test_folder' });
		const htmlNote = await Note.save({ title: 'test', body: '<p>Hello</p>', parent_id: folder.id, markup_language: MarkupLanguage.Html });
		state.selectedNoteIds = [htmlNote.id];

		await convertHtmlToMarkdown.runtime().execute({ state, dispatch: () => {} });

		const refreshedNote = await Note.load(htmlNote.id);
		const trashedNotes = await Note.previews(getTrashFolderId());
		const backupNote = await Note.load(trashedNotes[0].id);

		expect(refreshedNote.id).toBe(htmlNote.id);
		expect(refreshedNote.deleted_time).toBe(0);
		expect(refreshedNote.markup_language).toBe(MarkupLanguage.Markdown);

		expect(trashedNotes).toHaveLength(1);
		expect(backupNote.id).not.toBe(htmlNote.id);
		expect(backupNote.deleted_time).not.toBe(0);
		expect(backupNote.body).toBe(htmlNote.body);
		expect(backupNote.markup_language).toBe(MarkupLanguage.Html);
	});

	it('should preserve note metadata when converting in place', async () => {
		const folder = await Folder.save({ title: 'test_folder' });
		const htmlNoteProperties = {
			title: 'test',
			body: '<p>Hello</p>',
			parent_id: folder.id,
			markup_language: MarkupLanguage.Html,
			author: 'test-author',
			is_todo: 1,
			todo_completed: 1,
		};
		const htmlNote = await Note.save(htmlNoteProperties);
		state.selectedNoteIds = [htmlNote.id];

		await convertHtmlToMarkdown.runtime().execute({ state, dispatch: jest.fn() });

		const notes = await Note.previews(folder.id);
		expect(notes).toHaveLength(1);
		const noteConvertedToMarkdownId = notes[0].id;

		const markdownNote = await Note.load(noteConvertedToMarkdownId);

		const fields: (keyof NoteEntity)[] = ['parent_id', 'title', 'author', 'is_todo', 'todo_completed'];
		for (const field of fields) {
			expect(htmlNote[field]).toEqual(markdownNote[field]);
		}
	});

	it('should preserve user timestamps from the original note', async () => {
		const folder = await Folder.save({ title: 'test_folder' });
		const createdTime = new Date('2026-05-04T10:59:00Z').getTime();
		const updatedTime = new Date('2026-05-04T10:59:00Z').getTime();
		const userCreatedTime = new Date('2019-07-15T10:02:00Z').getTime();
		const userUpdatedTime = new Date('2020-08-16T11:03:00Z').getTime();
		const htmlNote = await Note.save({
			title: 'test',
			body: '<p>Hello</p>',
			parent_id: folder.id,
			markup_language: MarkupLanguage.Html,
			created_time: createdTime,
			updated_time: updatedTime,
			user_created_time: userCreatedTime,
			user_updated_time: userUpdatedTime,
		}, { autoTimestamp: false });
		state.selectedNoteIds = [htmlNote.id];

		await convertHtmlToMarkdown.runtime().execute({ state, dispatch: jest.fn() });

		const notes = await Note.previews(folder.id);
		expect(notes).toHaveLength(1);
		const markdownNote = await Note.load(notes[0].id);

		expect(markdownNote.user_created_time).toBe(userCreatedTime);
		expect(markdownNote.user_updated_time).toBe(userUpdatedTime);
		expect(markdownNote.updated_time).toBeGreaterThan(updatedTime);
	});

	it('should generate action to trigger notification', async () => {
		const folder = await Folder.save({ title: 'test_folder' });
		const htmlNoteProperties = {
			title: 'test',
			body: '<p>Hello</p>',
			parent_id: folder.id,
			markup_language: MarkupLanguage.Html,
			author: 'test-author',
			is_todo: 1,
			todo_completed: 1,
		};
		const htmlNote = await Note.save(htmlNoteProperties);
		state.selectedNoteIds = [htmlNote.id];

		await convertHtmlToMarkdown.runtime().execute({ state, dispatch: jest.fn() });

		expect(shim.showToast).toHaveBeenCalled();
	});

	it('should cause note to not disappear from search results', async () => {
		const searchEngine = new SearchEngine();
		searchEngine.setDb(db());

		const folder = await Folder.save({ title: 'test_folder' });
		const htmlNote = await Note.save({ title: 'search note', body: '<p>Hello</p>', parent_id: folder.id, markup_language: MarkupLanguage.Html });
		await searchEngine.syncTables();

		const searchResultsBeforeConversion = await SearchEngineUtils.notesForQuery('search note', true, null, searchEngine);
		expect(searchResultsBeforeConversion.notes.map(note => note.id)).toEqual([htmlNote.id]);

		state.selectedNoteIds = [htmlNote.id];
		await convertHtmlToMarkdown.runtime().execute({ state, dispatch: jest.fn() });
		await searchEngine.syncTables();

		const searchResultsAfterConversion = await SearchEngineUtils.notesForQuery('search note', true, null, searchEngine);
		expect(searchResultsAfterConversion.notes.map(note => note.id)).toEqual([htmlNote.id]);
	});

});
