import * as convertHtmlToMarkdown from './convertNoteToMarkdown';
import { defaultState, State } from '../reducer';
import Note from '../models/Note';
import { MarkupLanguage } from '@joplin/renderer';
import { encryptionService, setupDatabaseAndSynchronizer, switchClient } from '../testing/test-utils';
import Folder from '../models/Folder';
import { NoteEntity } from '../services/database/types';
import shim from '../shim';
import Setting from '../models/Setting';
import EncryptionService from '../services/e2ee/EncryptionService';
import NoteLockKey from '../services/noteLock/NoteLockKey';
import NoteLockService from '../services/noteLock/NoteLockService';
import NoteLockSession from '../services/noteLock/NoteLockSession';

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

	it.each([
		{ label: 'not convert a locked note', flagEnabled: true, blocked: true },
		{ label: 'convert a locked note when note lock is disabled', flagEnabled: false, blocked: false },
	])('should $label', async ({ flagEnabled, blocked }) => {
		Setting.setValue('featureFlag.noteLock', flagEnabled);
		shim.showErrorDialog = jest.fn();
		const folder = await Folder.save({ title: 'test_folder' });
		const htmlNote = await Note.save({ title: 'test', body: '<p>Hello</p>', parent_id: folder.id, markup_language: MarkupLanguage.Html, is_locked: 1 });
		state.selectedNoteIds = [htmlNote.id];

		await convertHtmlToMarkdown.runtime().execute({ state, dispatch: jest.fn() });

		expect(shim.showErrorDialog).toHaveBeenCalledTimes(blocked ? 1 : 0);
		// The original note is only moved to the trash once it has been converted.
		expect((await Note.load(htmlNote.id)).deleted_time === 0).toBe(blocked);
	});

	it('should convert a locked note when the session is unlocked', async () => {
		Setting.setValue('featureFlag.noteLock', true);
		shim.showErrorDialog = jest.fn();
		NoteLockService.destroyInstance();
		NoteLockSession.destroyInstance();
		NoteLockKey.destroyInstance();
		EncryptionService.instance_ = encryptionService();
		await NoteLockKey.instance().create('123456');
		await NoteLockSession.instance().unlock('123456');

		const folder = await Folder.save({ title: 'test_folder' });
		const htmlNote = await Note.save({ title: 'test', body: '<p>Hello</p>', parent_id: folder.id, markup_language: MarkupLanguage.Html });
		const lockedNote = { ...(await Note.load(htmlNote.id)), is_locked: 1, isDecrypted: true };
		await Note.save(lockedNote, { useNoteLock: true });
		state.selectedNoteIds = [htmlNote.id];

		await convertHtmlToMarkdown.runtime().execute({ state, dispatch: jest.fn() });

		expect(shim.showErrorDialog).not.toHaveBeenCalled();
		const notes = await Note.previews(folder.id);
		expect(notes).toHaveLength(1);
		const converted = await Note.load(notes[0].id, { useNoteLock: true });
		expect(converted.is_locked).toBe(1);
		expect(converted.markup_language).toBe(MarkupLanguage.Markdown);
		expect(converted.body).toContain('Hello');
		// The stored row keeps a ciphertext body.
		expect((await Note.load(notes[0].id)).body).not.toContain('Hello');
		expect((await Note.load(htmlNote.id)).deleted_time).not.toBe(0);
	});

});
