import Setting from '../../models/Setting';
import Note from '../../models/Note';
import Folder from '../../models/Folder';
import { encryptionService, setupDatabaseAndSynchronizer, switchClient, afterAllCleanUp } from '../../testing/test-utils';
import EncryptionService from '../e2ee/EncryptionService';
import NoteLockKey from './NoteLockKey';
import NoteLockService from './NoteLockService';
import NoteLockSession from './NoteLockSession';
import { disableNoteLock, enableNoteLock } from './setNoteLockState';
import eventManager, { EventName } from '../../eventManager';
import BaseItem from '../../models/BaseItem';
import { defaultState as defaultShareState, ShareType } from '../share/reducer';

const sharedOrPublishedError = 'Cannot lock a note that is being shared or published';

const setUpUnlockedSession = async (password = '123456') => {
	await NoteLockKey.instance().create(password);
	await NoteLockSession.instance().unlock(password);
};

describe('setNoteLockState', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		NoteLockService.destroyInstance();
		NoteLockSession.destroyInstance();
		NoteLockKey.destroyInstance();
		EncryptionService.instance_ = encryptionService();
		Setting.setValue('featureFlag.noteLock', true);
		BaseItem.syncShareCache = defaultShareState;
	});

	afterAll(async () => {
		await afterAllCleanUp();
	});

	it('should validate and emit the state change without saving the note', async () => {
		await setUpUnlockedSession();
		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'note', body: 'secret', parent_id: folder.id });

		const events: unknown[] = [];
		const listener = (event: unknown) => events.push(event);
		eventManager.on(EventName.NoteLockNoteStateChange, listener);
		try {
			await enableNoteLock(note.id);
			expect(events).toEqual([{ noteId: note.id, isLocked: true }]);
			// The note screen persists the change through its scheduled gated save.
			expect((await Note.load(note.id)).is_locked).toBe(0);
			expect((await Note.load(note.id)).body).toBe('secret');

			await Note.save({ id: note.id, is_locked: 1 });
			await disableNoteLock(note.id);
			expect(events[1]).toEqual({ noteId: note.id, isLocked: false });
			expect((await Note.load(note.id)).is_locked).toBe(1);
		} finally {
			eventManager.off(EventName.NoteLockNoteStateChange, listener);
		}
	});

	it('should throw when the note is already in the requested state', async () => {
		await setUpUnlockedSession();
		const note = await Note.save({ title: 'note', body: 'plain' });

		await expect(disableNoteLock(note.id)).rejects.toThrow('not locked');

		await Note.save({ id: note.id, is_locked: 1 });
		await expect(enableNoteLock(note.id)).rejects.toThrow('already locked');
	});

	it('should fail closed when the session is locked', async () => {
		await setUpUnlockedSession();
		const note = await Note.save({ title: 'note', body: 'secret' });

		NoteLockSession.instance().lock();
		await expect(enableNoteLock(note.id)).rejects.toThrow();

		await Note.save({ id: note.id, is_locked: 1 });
		await expect(disableNoteLock(note.id)).rejects.toThrow();
	});

	test.each([
		['deleted note', { deleted_time: 1 }],
		['conflict note', { is_conflict: 1 }],
	])('should refuse to change the lock state of a %s', async (_label, fields) => {
		await setUpUnlockedSession();
		const note = await Note.save({ title: 'note', body: 'secret', ...fields });
		await expect(enableNoteLock(note.id)).rejects.toThrow();
		expect((await Note.load(note.id)).is_locked).toBe(0);
	});

	test.each([
		['note in a shared notebook', { share_id: 'share-1' }],
		['published note', { is_shared: 1 }],
	])('should refuse to lock a %s', async (_label, fields) => {
		await setUpUnlockedSession();
		const note = await Note.save({ title: 'note', body: 'secret', ...fields });
		await expect(enableNoteLock(note.id)).rejects.toThrow();
		expect((await Note.load(note.id)).is_locked).toBe(0);
	});

	// Only entering the lock is blocked: a note that reached either state while already locked
	// would otherwise have no way back.
	test.each([
		['note in a shared notebook', { share_id: 'share-1' }],
		['published note', { is_shared: 1 }],
	])('should still allow removing the lock from a %s', async (_label, fields) => {
		await setUpUnlockedSession();
		// Two steps because the model guard refuses creating a note that is locked and shared at once.
		const note = await Note.save({ title: 'note', body: 'secret', is_locked: 1 });
		await Note.save({ id: note.id, ...fields });
		await expect(disableNoteLock(note.id)).resolves.toBeUndefined();
	});

	// Sharing and publishing only stamp share_id and is_shared on the notes during the next sync,
	// so the note row still looks untouched while the share already exists on the server.
	test.each([
		['published notebook', ShareType.PublishedFolder],
		['shared notebook', ShareType.Folder],
	])('should refuse to lock a note in an already %s before sync marks the note', async (_label, type) => {
		await setUpUnlockedSession();
		const parent = await Folder.save({ title: 'parent' });
		const folder = await Folder.save({ title: 'child', parent_id: parent.id });
		const note = await Note.save({ title: 'note', body: 'secret', parent_id: folder.id });
		BaseItem.syncShareCache = {
			...defaultShareState,
			shares: [{ id: 'share-1', type, folder_id: parent.id, note_id: '', master_key_id: '' }],
		};

		await expect(enableNoteLock(note.id)).rejects.toThrow(sharedOrPublishedError);
		expect((await Note.load(note.id)).is_locked).toBe(0);
	});

	it('should refuse to lock a note that is already published on its own', async () => {
		await setUpUnlockedSession();
		const note = await Note.save({ title: 'note', body: 'secret' });
		BaseItem.syncShareCache = {
			...defaultShareState,
			shares: [{ id: 'share-1', type: ShareType.Note, folder_id: '', note_id: note.id, master_key_id: '' }],
		};

		await expect(enableNoteLock(note.id)).rejects.toThrow(sharedOrPublishedError);
	});

	// A note created inside a shared notebook keeps share_id = '' until the next sync propagates
	// it, so the ancestor's own marker is the only local evidence in the meantime.
	test.each([
		['shared', { share_id: 'share-1' }],
		['published', { is_shared: 1 }],
	])('should refuse to lock a note whose notebook is %s while the cache is empty', async (_label, fields) => {
		await setUpUnlockedSession();
		const root = await Folder.save({ title: 'root', ...fields });
		const child = await Folder.save({ title: 'child', parent_id: root.id });
		const note = await Note.save({ title: 'note', body: 'secret', parent_id: child.id });
		BaseItem.syncShareCache = { ...defaultShareState, shares: [] };

		await expect(enableNoteLock(note.id)).rejects.toThrow(sharedOrPublishedError);
		expect((await Note.load(note.id)).is_locked).toBe(0);
	});

	it('should allow locking again once the share is gone from both the rows and the cache', async () => {
		await setUpUnlockedSession();
		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'note', body: 'secret', parent_id: folder.id });
		BaseItem.syncShareCache = { ...defaultShareState, shares: [] };

		await expect(enableNoteLock(note.id)).resolves.toBeUndefined();
	});

	it('should throw when note lock is not enabled', async () => {
		await setUpUnlockedSession();
		const note = await Note.save({ title: 'note', body: 'secret' });
		Setting.setValue('featureFlag.noteLock', false);
		await expect(enableNoteLock(note.id)).rejects.toThrow();
	});

});
