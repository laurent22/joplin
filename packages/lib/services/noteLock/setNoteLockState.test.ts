import Setting from '../../models/Setting';
import Note from '../../models/Note';
import Folder from '../../models/Folder';
import { encryptionService, setupDatabaseAndSynchronizer, switchClient, afterAllCleanUp } from '../../testing/test-utils';
import EncryptionService from '../e2ee/EncryptionService';
import NoteLockKey from './NoteLockKey';
import NoteLockService from './NoteLockService';
import NoteLockSession from './NoteLockSession';
import { disableNoteLock, enableNoteLock } from './setNoteLockState';

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

	it('should encrypt on enable and decrypt back on disable', async () => {
		await setUpUnlockedSession();
		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'note', body: 'secret [](:/00000000000000000000000000000001)', parent_id: folder.id });

		await enableNoteLock(note.id);

		const locked = await Note.load(note.id);
		expect(locked.is_locked).toBe(1);
		expect(locked.body).not.toContain('secret');
		expect(locked.extracted_resource_ids).toBe('00000000000000000000000000000001');
		expect((await Note.load(note.id, { useNoteLock: true })).body).toBe(note.body);

		await disableNoteLock(note.id);

		const unlocked = await Note.load(note.id);
		expect(unlocked.is_locked).toBe(0);
		expect(unlocked.body).toBe(note.body);
		expect(unlocked.extracted_resource_ids).toBe('');
	});

	it('should throw when the note is already in the requested state', async () => {
		await setUpUnlockedSession();
		const note = await Note.save({ title: 'note', body: 'plain' });

		await expect(disableNoteLock(note.id)).rejects.toThrow('not locked');
		expect((await Note.load(note.id)).body).toBe('plain');

		await enableNoteLock(note.id);
		const lockedBody = (await Note.load(note.id)).body;
		await expect(enableNoteLock(note.id)).rejects.toThrow('already locked');
		expect((await Note.load(note.id)).body).toBe(lockedBody);
	});

	it('should fail closed when the session is locked', async () => {
		await setUpUnlockedSession();
		const note = await Note.save({ title: 'note', body: 'secret' });

		NoteLockSession.instance().lock();
		await expect(enableNoteLock(note.id)).rejects.toThrow();
		expect((await Note.load(note.id)).is_locked).toBe(0);

		await NoteLockSession.instance().unlock('123456');
		await enableNoteLock(note.id);
		NoteLockSession.instance().lock();
		await expect(disableNoteLock(note.id)).rejects.toThrow();
		expect((await Note.load(note.id)).is_locked).toBe(1);
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
