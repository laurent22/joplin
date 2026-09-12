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

	it('should throw when note lock is not enabled', async () => {
		await setUpUnlockedSession();
		const note = await Note.save({ title: 'note', body: 'secret' });
		Setting.setValue('featureFlag.noteLock', false);
		await expect(enableNoteLock(note.id)).rejects.toThrow();
	});

});
