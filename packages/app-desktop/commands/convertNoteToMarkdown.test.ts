import * as convertHtmlToMarkdown from './convertNoteToMarkdown';
import { AppState, createAppDefaultState } from '../app.reducer';
import Note from '@joplin/lib/models/Note';
import { MarkupLanguage } from '@joplin/renderer';
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import Folder from '@joplin/lib/models/Folder';
import { NoteEntity } from '@joplin/lib/services/database/types';

describe('convertNoteToMarkdown', () => {
	let state: AppState = undefined;

	beforeEach(async () => {
		state = createAppDefaultState({});
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should set the original note to be trashed', async () => {
		const folder = await Folder.save({ title: 'test_folder' });
		const htmlNote = await Note.save({ title: 'test', body: '<p>Hello</p>', parent_id: folder.id, markup_language: MarkupLanguage.Html });
		state.selectedNoteIds = [htmlNote.id];

		await convertHtmlToMarkdown.runtime().execute({ state, dispatch: () => {} });

		const refreshedNote = await Note.load(htmlNote.id);

		expect(htmlNote.deleted_time).toBe(0);
		expect(refreshedNote.deleted_time).not.toBe(0);
	});

	it('should recreate a new note that is a clone of the original', async () => {
		let noteConvertedToMarkdownId = '';
		const dispatchFn = jest.fn()
			.mockImplementationOnce(() => {})
			.mockImplementationOnce(action => {
				noteConvertedToMarkdownId = action.id;
			});

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

		await convertHtmlToMarkdown.runtime().execute({ state, dispatch: dispatchFn });

		expect(dispatchFn).toHaveBeenCalledTimes(2);
		expect(noteConvertedToMarkdownId).not.toBe('');

		const markdownNote = await Note.load(noteConvertedToMarkdownId);

		const fields: (keyof NoteEntity)[] = ['parent_id', 'title', 'author', 'is_todo', 'todo_completed'];
		for (const field of fields) {
			expect(htmlNote[field]).toEqual(markdownNote[field]);
		}
	});

	it('should generate action to trigger notification', async () => {
		let originalHtmlNoteId = '';
		let actionType = '';
		const dispatchFn = jest.fn()
			.mockImplementationOnce(action => {
				originalHtmlNoteId = action.value;
				actionType = action.type;
			})
			.mockImplementationOnce(() => {});

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

		await convertHtmlToMarkdown.runtime().execute({ state, dispatch: dispatchFn });

		expect(dispatchFn).toHaveBeenCalledTimes(2);

		expect(originalHtmlNoteId).toBe(htmlNote.id);
		expect(actionType).toBe('NOTE_HTML_TO_MARKDOWN_DONE');
	});

});
