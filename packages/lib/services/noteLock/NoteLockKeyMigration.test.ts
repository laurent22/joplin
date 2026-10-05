import Setting from '../../models/Setting';
import Note from '../../models/Note';
import uuid from '../../uuid';
import { afterAllCleanUp, encryptionService, setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import EncryptionService from '../e2ee/EncryptionService';
import { MasterKeyEntity } from '../e2ee/types';
import { localSyncInfo, noteLockKeyConflict } from '../synchronizer/syncInfoUtils';
import NoteLockKey, { DecryptedNoteLockKey } from './NoteLockKey';
import NoteLockNote from './NoteLockNote';
import NoteLockService from './NoteLockService';
import NoteLockSession from './NoteLockSession';
import { finishNoteLockKeyMigration, migrateLockedNotes, startNoteLockKeyMigration } from './NoteLockKeyMigration';
import eventManager, { EventName, NoteLockSessionChangeEvent } from '../../eventManager';

const localPassword = '111111';
const targetPassword = '222222';
const targetSyncMigrationId = '0123456789abcdef0123456789abcdef';

const generateKey = async (password: string): Promise<MasterKeyEntity> => ({ ...await encryptionService().generateMasterKey(password), id: uuid.create() });

const decryptKey = async (key: MasterKeyEntity, password: string): Promise<DecryptedNoteLockKey> => ({ id: key.id, plainText: await encryptionService().decryptMasterKeyContent(key, password) });

// Encrypts outside the session so the fixture can use a key the session would refuse.
const noteLockedWith = async (key: DecryptedNoteLockKey, body: string) => {
	const cipherText = await encryptionService().encryptString(body, { masterKeyId: key.id, decryptedMasterKey: key.plainText });
	return Note.save({ title: body, body: cipherText, is_locked: 1 });
};

const bodyDecryptedWith = async (noteId: string, key: DecryptedNoteLockKey) => (await NoteLockNote.decryptBody(await Note.load(noteId), key)).body;

const storedBodies = async () => (await Note.all({ fields: ['id', 'body'] })).map(n => n.body).sort();

describe('NoteLockKeyMigration', () => {

	let targetKey: MasterKeyEntity;
	let decryptedTargetKey: DecryptedNoteLockKey;
	let decryptedLocalKey: DecryptedNoteLockKey;

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		NoteLockService.destroyInstance();
		NoteLockSession.destroyInstance();
		NoteLockKey.destroyInstance();
		EncryptionService.instance_ = encryptionService();
		Setting.setValue('featureFlag.noteLock', true);

		await NoteLockKey.instance().create(localPassword);
		await NoteLockSession.instance().unlock(localPassword);
		decryptedLocalKey = await NoteLockKey.instance().decrypt(localPassword);
		targetKey = await generateKey(targetPassword);
		decryptedTargetKey = await decryptKey(targetKey, targetPassword);
		Setting.setValue('noteLock.conflictNoteLockKey', { noteLockKey: targetKey, syncMigrationId: targetSyncMigrationId });
	});

	afterAll(async () => {
		await afterAllCleanUp();
	});

	it('should re-encrypt the notes locked with the local key and report the rest', async () => {
		const note1 = await Note.save({ title: 'one', body: 'one', is_locked: 1 }, { useNoteLock: true });
		const note2 = await Note.save({ title: 'two', body: 'two', is_locked: 1 }, { useNoteLock: true });
		const staleKey = await generateKey('333333');
		const staleNote = await noteLockedWith(await decryptKey(staleKey, '333333'), 'stale');
		const corruptCipherText = (await Note.load(note1.id)).body;
		const corruptNote = await Note.save({ title: 'corrupt', body: `${corruptCipherText.slice(0, -8)}xxxxxxxx`, is_locked: 1 });
		await Note.save({ title: 'plain', body: 'plain' });
		const localKeyBefore = NoteLockKey.instance().load();

		const result = await migrateLockedNotes(localPassword, targetPassword);

		expect(result).toEqual({ migrated: 2, skipped: 1, failed: 1 });
		expect(await bodyDecryptedWith(note1.id, decryptedTargetKey)).toBe('one');
		expect(await bodyDecryptedWith(note2.id, decryptedTargetKey)).toBe('two');
		expect((await Note.load(staleNote.id)).body).toBe(staleNote.body);
		expect((await Note.load(corruptNote.id)).body).toBe(corruptNote.body);
		expect((await Note.load(note1.id)).is_locked).toBe(1);
		// Nothing is adopted until the user finishes, so an interrupted migration loses no key.
		expect(NoteLockKey.instance().load()).toEqual(localKeyBefore);
		expect(noteLockKeyConflict()).toEqual({ noteLockKey: targetKey, syncMigrationId: targetSyncMigrationId });
	});

	it('should leave notes already under the target key alone on retry', async () => {
		await Note.save({ title: 'one', body: 'one', is_locked: 1 }, { useNoteLock: true });
		const staleKey = await generateKey('333333');
		await noteLockedWith(await decryptKey(staleKey, '333333'), 'stale');
		await migrateLockedNotes(localPassword, targetPassword);
		const bodiesAfterFirstRun = await storedBodies();

		expect(await migrateLockedNotes(localPassword, targetPassword)).toEqual({ migrated: 0, skipped: 1, failed: 0 });
		expect(await storedBodies()).toEqual(bodiesAfterFirstRun);
	});

	test.each([
		['local', 'wrong', targetPassword],
		['target', localPassword, 'wrong'],
	])('should not touch any note when the %s password is wrong', async (_which, local, target) => {
		await Note.save({ title: 'one', body: 'one', is_locked: 1 }, { useNoteLock: true });
		const bodiesBefore = await storedBodies();

		await expect(migrateLockedNotes(local, target)).rejects.toThrow();
		expect(await storedBodies()).toEqual(bodiesBefore);
	});

	it('should fail closed when note lock is disabled', async () => {
		await Note.save({ title: 'one', body: 'one', is_locked: 1 }, { useNoteLock: true });
		const bodiesBefore = await storedBodies();
		Setting.setValue('featureFlag.noteLock', false);

		await expect(migrateLockedNotes(localPassword, targetPassword)).rejects.toThrow('not enabled');
		expect(await storedBodies()).toEqual(bodiesBefore);
	});

	it('should adopt the target key and lineage, clear the flags and lock the session on finish', async () => {
		Setting.setValue('noteLock.passwordReset', true);
		expect(NoteLockSession.instance().isUnlocked()).toBe(true);
		const events: NoteLockSessionChangeEvent[] = [];
		const listener = (event: NoteLockSessionChangeEvent) => events.push(event);
		eventManager.on(EventName.NoteLockSessionChange, listener);

		try {
			finishNoteLockKeyMigration();

			// The lock is announced right away rather than on the next session check, so the UI follows.
			expect(events).toEqual([{ unlocked: false }]);
			expect(NoteLockKey.instance().load()).toEqual(targetKey);
			expect(localSyncInfo().syncMigrationId).toBe(targetSyncMigrationId);
			expect(noteLockKeyConflict()).toBeNull();
			expect(Setting.value('noteLock.passwordReset')).toBe(false);
			await NoteLockSession.instance().unlock(targetPassword);
			expect(NoteLockSession.instance().isUnlocked()).toBe(true);
		} finally {
			eventManager.off(EventName.NoteLockSessionChange, listener);
		}
	});

	it('should report a background run that starts once the passwords are accepted', async () => {
		const note = await Note.save({ title: 'one', body: 'one', is_locked: 1 }, { useNoteLock: true });
		const dispatch = jest.fn();
		const onStarted = jest.fn();

		await expect(startNoteLockKeyMigration(localPassword, 'wrong', dispatch, onStarted)).rejects.toThrow();
		expect(onStarted).not.toHaveBeenCalled();
		expect(dispatch).not.toHaveBeenCalled();

		const corruptNote = await Note.save({ title: 'corrupt', body: `${(await Note.load(note.id)).body.slice(0, -8)}xxxxxxxx`, is_locked: 1 });
		await startNoteLockKeyMigration(localPassword, targetPassword, dispatch, onStarted);
		expect(onStarted).toHaveBeenCalledTimes(1);
		expect(dispatch.mock.calls).toEqual([
			[{ type: 'NOTE_LOCK_MIGRATION_STATUS_SET', value: { running: true, failed: 0 } }],
			[{ type: 'NOTE_LOCK_MIGRATION_STATUS_SET', value: { running: false, failed: 1 } }],
		]);
		expect(noteLockKeyConflict()).not.toBeNull();

		await Note.delete(corruptNote.id);
		dispatch.mockClear();
		await startNoteLockKeyMigration(localPassword, targetPassword, dispatch, onStarted);
		expect(dispatch).toHaveBeenLastCalledWith({ type: 'NOTE_LOCK_MIGRATION_STATUS_SET', value: { running: false, failed: 0 } });
		expect(NoteLockKey.instance().load()).toEqual(targetKey);
		expect(await bodyDecryptedWith(note.id, decryptedTargetKey)).toBe('one');
	});

	it('should refuse to migrate or finish without a parked key', async () => {
		Setting.setValue('noteLock.conflictNoteLockKey', {});

		await expect(migrateLockedNotes(localPassword, targetPassword)).rejects.toThrow('No note lock key conflict');
		expect(() => finishNoteLockKeyMigration()).toThrow('No note lock key conflict');
		expect(NoteLockKey.instance().load().id).toBe(decryptedLocalKey.id);
	});
});
