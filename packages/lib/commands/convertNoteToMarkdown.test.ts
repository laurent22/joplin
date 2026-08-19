import * as convertHtmlToMarkdown from './convertNoteToMarkdown';
import { defaultState, State } from '../reducer';
import Note from '../models/Note';
import { MarkupLanguage } from '@joplin/renderer';
import { setupDatabaseAndSynchronizer, switchClient } from '../testing/test-utils';
import Folder from '../models/Folder';
import { NoteEntity } from '../services/database/types';
import shim from '../shim';

describe('convertNoteToMarkdown', () => {
	let state: State = undefined;

	beforeEach(async () => {
		state = defaultState;
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		shim.showToast = jest.fn();
	});

	it('should set the original note to be trashed', async () => {
		const folder = await Folder.save({ title: 'test_folder' });
		const htmlNote = await Note.save({ title: 'test', body: '<p>Hello</p>', parent_id: folder.id, markup_language: MarkupLanguage.Html });
		state.selectedNoteIds = [htmlNote.id];

		await convertHtmlToMarkdown.runtime().execute({ state, dispatch: jest.fn() });

		const refreshedNote = await Note.load(htmlNote.id);

		expect(htmlNote.deleted_time).toBe(0);
		expect(refreshedNote.deleted_time).not.toBe(0);
	});

	it('should recreate a new note that is a clone of the original', async () => {
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

});
