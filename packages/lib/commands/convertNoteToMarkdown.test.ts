import * as convertHtmlToMarkdown from './convertNoteToMarkdown';
import { defaultState, State } from '../reducer';
import Note from '../models/Note';
import { MarkupLanguage } from '@joplin/renderer';
import { setupDatabaseAndSynchronizer, switchClient } from '../testing/test-utils';
import Folder from '../models/Folder';
import { NoteEntity } from '../services/database/types';

describe('convertNoteToMarkdown', () => {
	let state: State = undefined;

	beforeEach(async () => {
		state = defaultState;
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
		const dispatchFn = jest.fn();

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

		expect(dispatchFn).toHaveBeenCalledTimes(1);

	});

});
