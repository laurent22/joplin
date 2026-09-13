import * as convertHtmlToMarkdown from './convertNoteToMarkdown';
import { defaultState, State } from '../reducer';
import Note from '../models/Note';
import { MarkupLanguage } from '@joplin/renderer';
import { db, encryptionService, setupDatabaseAndSynchronizer, switchClient } from '../testing/test-utils';
import Folder from '../models/Folder';
import { NoteEntity } from '../services/database/types';
import shim from '../shim';
import SearchEngine from '../services/search/SearchEngine';
import SearchEngineUtils from '../services/search/SearchEngineUtils';
import { getTrashFolderId } from '../services/trash';
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

	it('should keep the original note active and trash an HTML backup', async () => {
		const folder = await Folder.save({ title: 'test_folder' });
		const htmlNote = await Note.save({ title: 'test', body: '<p>Hello</p>', parent_id: folder.id, markup_language: MarkupLanguage.Html });
		state.selectedNoteIds = [htmlNote.id];

		await convertHtmlToMarkdown.runtime().execute({ state, dispatch: jest.fn() });

		const refreshedNote = await Note.load(htmlNote.id);
		const trashedNotes = await Note.previews(getTrashFolderId());

		expect(refreshedNote.id).toBe(htmlNote.id);
		expect(refreshedNote.deleted_time).toBe(0);
		expect(refreshedNote.markup_language).toBe(MarkupLanguage.Markdown);
		expect(trashedNotes).toHaveLength(1);

		const backupNote = await Note.load(trashedNotes[0].id);

		expect(backupNote.id).not.toBe(htmlNote.id);
		expect(backupNote.deleted_time).not.toBe(0);
		expect(backupNote.body).toBe(htmlNote.body);
		expect(backupNote.markup_language).toBe(MarkupLanguage.Html);
	});

	it('should preserve an existing internal link after converting an HTML note', async () => {
		const folder = await Folder.save({ title: 'test_folder' });
		const htmlNote = await Note.save({ title: 'Target', body: '<p>Hello</p>', parent_id: folder.id, markup_language: MarkupLanguage.Html });
		const linkNote = await Note.save({ title: 'Link', body: `[Target](:/${htmlNote.id})`, parent_id: folder.id });
		state.selectedNoteIds = [htmlNote.id];

		await convertHtmlToMarkdown.runtime().execute({ state, dispatch: jest.fn() });

		const savedLinkNote = await Note.load(linkNote.id);
		expect(savedLinkNote.body).toBe(linkNote.body);

		const linkedIds = await Note.linkedNoteIds(savedLinkNote.body);
		expect(linkedIds).toEqual([htmlNote.id]);

		const target = await Note.load(linkedIds[0]);
		expect(target.deleted_time).toBe(0);
		expect(target.markup_language).toBe(MarkupLanguage.Markdown);
		expect(target.body).toBe('Hello');
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
		const originalNote = await Note.load(htmlNote.id);
		expect(originalNote.deleted_time).toBe(0);
		expect(originalNote.markup_language).toBe(blocked ? MarkupLanguage.Html : MarkupLanguage.Markdown);
	});

	it('should not convert any of the selected notes when one is locked and the session is locked', async () => {
		Setting.setValue('featureFlag.noteLock', true);
		shim.showErrorDialog = jest.fn();
		NoteLockSession.destroyInstance();
		const folder = await Folder.save({ title: 'test_folder' });
		const plainNote = await Note.save({ title: 'plain', body: '<p>plain</p>', parent_id: folder.id, markup_language: MarkupLanguage.Html });
		const lockedNote = await Note.save({ title: 'locked', body: '<p>locked</p>', parent_id: folder.id, markup_language: MarkupLanguage.Html, is_locked: 1 });
		state.selectedNoteIds = [plainNote.id, lockedNote.id];

		await convertHtmlToMarkdown.runtime().execute({ state, dispatch: jest.fn() });

		expect(shim.showErrorDialog).toHaveBeenCalledTimes(1);
		expect((await Note.load(plainNote.id)).deleted_time).toBe(0);
		expect((await Note.load(lockedNote.id)).deleted_time).toBe(0);
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
		expect(converted.id).toBe(htmlNote.id);
		expect(converted.deleted_time).toBe(0);
	});

	it('should finish converting the remaining locked notes when the session locks mid-run', async () => {
		Setting.setValue('featureFlag.noteLock', true);
		shim.showErrorDialog = jest.fn();
		NoteLockService.destroyInstance();
		NoteLockSession.destroyInstance();
		NoteLockKey.destroyInstance();
		EncryptionService.instance_ = encryptionService();
		await NoteLockKey.instance().create('123456');
		await NoteLockSession.instance().unlock('123456');

		const folder = await Folder.save({ title: 'test_folder' });
		const noteIds = [];
		for (const title of ['one', 'two']) {
			const htmlNote = await Note.save({ title, body: `<p>${title}</p>`, parent_id: folder.id, markup_language: MarkupLanguage.Html });
			const lockedNote = { ...(await Note.load(htmlNote.id)), is_locked: 1, isDecrypted: true };
			await Note.save(lockedNote, { useNoteLock: true });
			noteIds.push(htmlNote.id);
		}
		state.selectedNoteIds = noteIds;

		const originalSave = Note.save.bind(Note);
		const spy = jest.spyOn(Note, 'save').mockImplementation(async (note, options) => {
			const saved = await originalSave(note, options);
			NoteLockSession.instance().lock();
			return saved;
		});
		try {
			await convertHtmlToMarkdown.runtime().execute({ state, dispatch: jest.fn() });
		} finally {
			spy.mockRestore();
		}

		expect(shim.showErrorDialog).not.toHaveBeenCalled();
		await NoteLockSession.instance().unlock('123456');
		const notes = await Note.previews(folder.id);
		expect(notes).toHaveLength(2);
		for (const preview of notes) {
			const converted = await Note.load(preview.id, { useNoteLock: true });
			expect(converted.markup_language).toBe(MarkupLanguage.Markdown);
			expect(converted.is_locked).toBe(1);
		}
	});

});
