import Setting from '../../models/Setting';
import Note from '../../models/Note';
import uuid from '../../uuid';
import { afterAllCleanUp, db, encryptionService, setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import EncryptionService from '../e2ee/EncryptionService';
import { MasterKeyEntity } from '../e2ee/types';
import { localSyncInfo, noteLockKeyConflict } from '../synchronizer/syncInfoUtils';
import NoteLockKey, { DecryptedNoteLockKey } from './NoteLockKey';
import NoteLockNote from './NoteLockNote';
import NoteLockService from './NoteLockService';
import NoteLockSession from './NoteLockSession';
import { confirmAndSkipNoteLockKeyMigration, finishNoteLockKeyMigration, migrateLockedNotes, notMigratedMessage, startNoteLockKeyMigration } from './NoteLockKeyMigration';
import eventManager, { EventName, NoteLockSessionChangeEvent } from '../../eventManager';
import shim from '../../shim';

const localPassword = '111111';
const targetPassword = '222222';
const targetSyncMigrationId = '0123456789abcdef0123456789abcdef';

const generateKey = async (password: string): Promise<MasterKeyEntity> => ({ ...await encryptionService().generateMasterKey(password), id: uuid.create() });

const decryptKey = async (key: MasterKeyEntity, password: string): Promise<DecryptedNoteLockKey> => ({ id: key.id, plainText: await encryptionService().decryptMasterKeyContent(key, password) });

// Encrypts outside the session so the fixture can use a key the session would refuse.
const noteLockedWith = async (key: DecryptedNoteLockKey, body: string) => {
	const cipherText = await encryptionService().encryptString(body, { masterKeyId: key.id, decryptedMasterKey: key.plainText, isNoteLock: true });
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

		expect(result).toEqual({ migrated: 2, skipped: 1, failed: 1, awaitingDecryption: 0 });
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

		expect(await migrateLockedNotes(localPassword, targetPassword)).toEqual({ migrated: 0, skipped: 1, failed: 0, awaitingDecryption: 0 });
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

	test.each([
		['Yes', 0, true],
		['No', 1, false],
	])('should skip the migration only when Yes is chosen in the warning (answer: %s)', async (_answer, response, skipped) => {
		const showMessageBox = jest.spyOn(shim, 'showMessageBox').mockResolvedValue(response);
		const dispatch = jest.fn();

		expect(await confirmAndSkipNoteLockKeyMigration(dispatch)).toBe(skipped);

		expect(showMessageBox.mock.calls[0][0]).toContain('JEX backup');
		expect(showMessageBox.mock.calls[0][1].buttons).toEqual(['Yes', 'No']);
		expect(NoteLockKey.instance().load().id).toBe(skipped ? targetKey.id : decryptedLocalKey.id);
		expect(dispatch).toHaveBeenCalledTimes(skipped ? 1 : 0);
		showMessageBox.mockRestore();
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
			[{ type: 'NOTE_LOCK_MIGRATION_STATUS_SET', value: { running: true, failed: 0, skipped: 0, awaitingDecryption: 0 } }],
			[{ type: 'NOTE_LOCK_MIGRATION_STATUS_SET', value: { running: false, failed: 1, skipped: 0, awaitingDecryption: 0 } }],
		]);
		expect(noteLockKeyConflict()).not.toBeNull();

		await Note.delete(corruptNote.id);
		dispatch.mockClear();
		await startNoteLockKeyMigration(localPassword, targetPassword, dispatch, onStarted);
		expect(dispatch).toHaveBeenLastCalledWith({ type: 'NOTE_LOCK_MIGRATION_STATUS_SET', value: { running: false, failed: 0, skipped: 0, awaitingDecryption: 0 } });
		expect(NoteLockKey.instance().load()).toEqual(targetKey);
		expect(await bodyDecryptedWith(note.id, decryptedTargetKey)).toBe('one');
	});

	it('should cancel a run with a popup when the feature flag is turned off during it', async () => {
		await Note.save({ title: 'one', body: 'one', is_locked: 1 }, { useNoteLock: true });
		const dispatch = jest.fn();
		const showErrorDialog = jest.spyOn(shim, 'showErrorDialog').mockResolvedValue();
		const save = Note.save.bind(Note);
		const saveSpy = jest.spyOn(Note, 'save').mockImplementation((o, options) => {
			Setting.setValue('featureFlag.noteLock', false);
			return save(o, options);
		});

		try {
			await startNoteLockKeyMigration(localPassword, targetPassword, dispatch, jest.fn());

			expect(dispatch).toHaveBeenLastCalledWith({ type: 'NOTE_LOCK_MIGRATION_STATUS_SET', value: null });
			expect(showErrorDialog).toHaveBeenCalledWith('The note lock key migration was cancelled because the note lock feature was turned off.');
			expect(noteLockKeyConflict()).not.toBeNull();
		} finally {
			saveSpy.mockRestore();
			showErrorDialog.mockRestore();
		}
	});

	it('should keep locked notes closed and refuse a password reset only while a run goes', async () => {
		await Note.save({ title: 'one', body: 'one', is_locked: 1 }, { useNoteLock: true });
		let unlockDuringRun: Promise<Error> = null;
		let resetDuringRun: Promise<Error> = null;
		await migrateLockedNotes(localPassword, targetPassword, () => {
			expect(NoteLockSession.instance().isUnlocked()).toBe(false);
			unlockDuringRun = NoteLockSession.instance().unlock(localPassword).then((): Error => null, (error: Error) => error);
			resetDuringRun = NoteLockSession.instance().reset('333333').then((): Error => null, (error: Error) => error);
		});

		expect((await unlockDuringRun)?.message).toContain('note lock key migration is in progress');
		expect((await resetDuringRun)?.message).toContain('cannot be reset while a note lock key migration is in progress');
		await NoteLockSession.instance().unlock(localPassword);
		expect(NoteLockSession.instance().isUnlocked()).toBe(true);
	});

	it('should refuse to migrate or finish without a parked key', async () => {
		Setting.setValue('noteLock.conflictNoteLockKey', {});

		await expect(migrateLockedNotes(localPassword, targetPassword)).rejects.toThrow('No note lock key conflict');
		expect(() => finishNoteLockKeyMigration()).toThrow('No note lock key conflict');
		expect(NoteLockKey.instance().load().id).toBe(decryptedLocalKey.id);
	});
	it('should keep the date a note was last changed by the user', async () => {
		const note = await Note.save({ title: 'one', body: 'one', is_locked: 1 }, { useNoteLock: true });
		await db().exec('UPDATE notes SET user_updated_time = 1000, updated_time = 1000 WHERE id = ?', [note.id]);

		expect(await migrateLockedNotes(localPassword, targetPassword)).toEqual({ migrated: 1, skipped: 0, failed: 0, awaitingDecryption: 0 });

		const migrated = await Note.load(note.id);
		expect(migrated.user_updated_time).toBe(1000);
		// Still moves, so the re-encrypted note is synced.
		expect(migrated.updated_time).toBeGreaterThan(1000);
	});

	it('should leave a note still waiting for sync decryption for a retry and not finish the migration', async () => {
		const waiting = await Note.save({ title: 'waiting', body: 'waiting', is_locked: 1 }, { useNoteLock: true });
		// What sync leaves until the decryption worker has run: is_locked stays readable, the body is not there yet.
		await db().exec('UPDATE notes SET encryption_applied = 1, body = \'\' WHERE id = ?', [waiting.id]);
		const dispatch = jest.fn();

		await startNoteLockKeyMigration(localPassword, targetPassword, dispatch, jest.fn());

		const status = { running: false, failed: 0, skipped: 0, awaitingDecryption: 1 };
		expect(dispatch).toHaveBeenLastCalledWith({ type: 'NOTE_LOCK_MIGRATION_STATUS_SET', value: status });
		expect(noteLockKeyConflict()).not.toBeNull();
		expect(notMigratedMessage(status)).toBe('1 locked note is still waiting to be decrypted and was not migrated yet.');
	});

});
