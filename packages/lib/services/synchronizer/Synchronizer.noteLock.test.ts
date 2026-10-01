import Setting from '../../models/Setting';
import Note from '../../models/Note';
import { afterAllCleanUp, encryptionService, fileApi, loadEncryptionMasterKey, setupDatabaseAndSynchronizer, switchClient, synchronizer, synchronizerStart } from '../../testing/test-utils';
import EncryptionService from '../e2ee/EncryptionService';
import NoteLockKey from '../noteLock/NoteLockKey';
import NoteLockSession from '../noteLock/NoteLockSession';
import NoteLockService from '../noteLock/NoteLockService';
import { fetchSyncInfo, localSyncInfo, noteLockKeyConflict, saveLocalSyncInfo } from './syncInfoUtils';
import { ErrorCode } from '../../errors';
import NoteLockNote from '../noteLock/NoteLockNote';
import { finishNoteLockKeyMigration, migrateLockedNotes } from '../noteLock/NoteLockKeyMigration';
import { MasterKeyEntity } from '../e2ee/types';
import { setupAndEnableEncryption } from '../e2ee/utils';

// Duplicates the singleton reset from NoteLockSession.test.ts: the note lock singletons cache the
// encryption service, so each client switch has to rebuild them.
const switchToClient = async (id: number) => {
	await switchClient(id);
	NoteLockService.destroyInstance();
	NoteLockSession.destroyInstance();
	NoteLockKey.destroyInstance();
	EncryptionService.instance_ = encryptionService();
};

const remoteNoteLockKeyId = async () => (await fetchSyncInfo(fileApi())).noteLockKey?.id;

// Lands the action inside the running sync, after it took its local snapshot and before the conflict check.
const duringTheLockedNotesCheck = (action: ()=> Promise<unknown>) => {
	const realHasLockedNotes = Note.hasLockedNotes.bind(Note);
	const spy = jest.spyOn(Note, 'hasLockedNotes').mockImplementation(async () => {
		spy.mockRestore();
		await action();
		return realHasLockedNotes();
	});
};

describe('Synchronizer.noteLock', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await setupDatabaseAndSynchronizer(2);
		await switchToClient(1);
	});

	afterAll(async () => {
		await afterAllCleanUp();
	});

	it('should propagate a password reset to the sync target and then to other devices', async () => {
		const firstKey = await NoteLockKey.instance().create('111111');
		const syncMigrationId = localSyncInfo().syncMigrationId;
		await Note.save({ title: 'locked', is_locked: 1 });
		await synchronizerStart();

		await switchToClient(2);
		await synchronizerStart();
		expect(NoteLockKey.instance().load().id).toBe(firstKey.id);
		const resetKey = await NoteLockSession.instance().reset('222222');
		await synchronizerStart();
		expect(await remoteNoteLockKeyId()).toBe(resetKey.id);
		expect(Setting.value('noteLock.passwordReset')).toBe(false);

		// Locked notes do not stop a same-lineage adoption: a reset is meant to reach every device.
		await switchToClient(1);
		await synchronizerStart();
		expect(NoteLockKey.instance().load()).toEqual(resetKey);
		expect(localSyncInfo().syncMigrationId).toBe(syncMigrationId);
	});

	it('should propagate the newest of repeated offline resets to the key they replaced', async () => {
		const firstKey = await NoteLockKey.instance().create('111111');
		await Note.save({ title: 'locked', is_locked: 1 });
		await synchronizerStart();

		await switchToClient(2);
		await synchronizerStart();
		await NoteLockSession.instance().reset('222222');
		const lastResetKey = await NoteLockSession.instance().reset('333333');
		expect(Setting.value('noteLock.keyIdToReset')).toBe(firstKey.id);
		await synchronizerStart();
		expect(await remoteNoteLockKeyId()).toBe(lastResetKey.id);
		expect(Setting.value('noteLock.passwordReset')).toBe(false);
		expect(Setting.value('noteLock.keyIdToReset')).toBe('');

		await switchToClient(1);
		await synchronizerStart();
		expect(NoteLockKey.instance().load()).toEqual(lastResetKey);
	});

	it('should park the sync target key instead of propagating a reset when another device reset first', async () => {
		Setting.setValue('featureFlag.noteLock', true);
		await NoteLockKey.instance().create('111111');
		await synchronizerStart();

		await switchToClient(2);
		Setting.setValue('featureFlag.noteLock', true);
		await synchronizerStart();
		await NoteLockSession.instance().reset('222222');
		await NoteLockSession.instance().unlock('222222');
		const note = await Note.save({ title: 'secret', body: 'secret body', is_locked: 1 }, { useNoteLock: true });

		// The other device resets and syncs first, so the key this reset replaced is gone from the target.
		await switchToClient(1);
		const winningKey = await NoteLockSession.instance().reset('333333');
		await synchronizerStart();
		expect(await remoteNoteLockKeyId()).toBe(winningKey.id);

		await switchToClient(2);
		for (let i = 0; i < 2; i++) {
			await expect(synchronizerStart(null, { throwOnError: true })).rejects.toMatchObject({ code: ErrorCode.NoteLockKeyConflict });
			expect(await remoteNoteLockKeyId()).toBe(winningKey.id);
			expect(Setting.value('noteLock.conflictNoteLockKey').noteLockKey).toEqual(winningKey);
		}

		expect(await migrateLockedNotes('222222', '333333')).toEqual({ migrated: 1, skipped: 0, failed: 0 });
		await finishNoteLockKeyMigration(false);
		expect(Setting.value('noteLock.passwordReset')).toBe(false);
		expect(Setting.value('noteLock.keyIdToReset')).toBe('');
		await synchronizerStart(null, { throwOnError: true });
		expect(NoteLockKey.instance().load()).toEqual(winningKey);
		expect(await remoteNoteLockKeyId()).toBe(winningKey.id);
		const key = await NoteLockKey.instance().decrypt('333333');
		expect((await NoteLockNote.decryptBody(await Note.load(note.id), key)).body).toBe('secret body');
	});

	it('should drop a reset that another device overtook when no note depends on it', async () => {
		await NoteLockKey.instance().create('111111');
		await synchronizerStart();

		await switchToClient(2);
		await synchronizerStart();
		await NoteLockSession.instance().reset('222222');

		await switchToClient(1);
		const winningKey = await NoteLockSession.instance().reset('333333');
		await synchronizerStart();

		await switchToClient(2);
		await synchronizerStart();
		expect(NoteLockKey.instance().load()).toEqual(winningKey);
		expect(await remoteNoteLockKeyId()).toBe(winningKey.id);
		expect(Setting.value('noteLock.passwordReset')).toBe(false);
		expect(Setting.value('noteLock.keyIdToReset')).toBe('');
		expect(Setting.value('noteLock.conflictNoteLockKey')).toEqual({});
	});

	it('should stop the sync and park the remote key when a different lineage meets local locked notes', async () => {
		const remoteKey = await NoteLockKey.instance().create('111111');
		const remoteSyncMigrationId = localSyncInfo().syncMigrationId;
		await synchronizerStart();

		await switchToClient(2);
		const localKey = await NoteLockKey.instance().create('222222');
		const localSyncMigrationId = localSyncInfo().syncMigrationId;
		await Note.save({ title: 'locked', is_locked: 1 });

		for (let i = 0; i < 2; i++) {
			await expect(synchronizerStart(null, { throwOnError: true })).rejects.toMatchObject({ code: ErrorCode.NoteLockKeyConflict });
			expect(NoteLockKey.instance().load()).toEqual(localKey);
			expect(localSyncInfo().syncMigrationId).toBe(localSyncMigrationId);
			expect(await remoteNoteLockKeyId()).toBe(remoteKey.id);
			expect(Setting.value('noteLock.conflictNoteLockKey')).toEqual({ noteLockKey: remoteKey, syncMigrationId: remoteSyncMigrationId });
		}
	});

	it('should drop a local key that no note depends on and adopt the sync target key', async () => {
		const remoteKey = await NoteLockKey.instance().create('111111');
		const remoteSyncMigrationId = localSyncInfo().syncMigrationId;
		await synchronizerStart();

		await switchToClient(2);
		await NoteLockKey.instance().create('222222');
		await synchronizerStart();

		expect(NoteLockKey.instance().load()).toEqual(remoteKey);
		expect(localSyncInfo().syncMigrationId).toBe(remoteSyncMigrationId);
		expect(await remoteNoteLockKeyId()).toBe(remoteKey.id);
		expect(Setting.value('noteLock.conflictNoteLockKey')).toEqual({});
	});

	it('should sync again after migrating local locked notes to the sync target key', async () => {
		Setting.setValue('featureFlag.noteLock', true);
		const remoteKey = await NoteLockKey.instance().create('111111');
		const remoteSyncMigrationId = localSyncInfo().syncMigrationId;
		await synchronizerStart();

		await switchToClient(2);
		Setting.setValue('featureFlag.noteLock', true);
		await NoteLockKey.instance().create('222222');
		await NoteLockSession.instance().unlock('222222');
		const note = await Note.save({ title: 'secret', body: 'secret body', is_locked: 1 }, { useNoteLock: true });
		await expect(synchronizerStart(null, { throwOnError: true })).rejects.toMatchObject({ code: ErrorCode.NoteLockKeyConflict });

		expect(await migrateLockedNotes('222222', '111111')).toEqual({ migrated: 1, skipped: 0, failed: 0 });
		await finishNoteLockKeyMigration(false);
		await synchronizerStart(null, { throwOnError: true });
		expect(NoteLockKey.instance().load()).toEqual(remoteKey);
		expect(localSyncInfo().syncMigrationId).toBe(remoteSyncMigrationId);
		expect(await remoteNoteLockKeyId()).toBe(remoteKey.id);

		await switchToClient(1);
		await synchronizerStart();
		const key = await NoteLockKey.instance().decrypt('111111');
		expect((await NoteLockNote.decryptBody(await Note.load(note.id), key)).body).toBe('secret body');
	});

	it('should park the sync target key instead of dropping a local key that a note started depending on mid-sync', async () => {
		Setting.setValue('featureFlag.noteLock', true);
		const remoteKey = await NoteLockKey.instance().create('111111');
		await synchronizerStart();

		await switchToClient(2);
		Setting.setValue('featureFlag.noteLock', true);
		const localKey = await NoteLockKey.instance().create('222222');
		await NoteLockSession.instance().unlock('222222');

		// Locks a note with the local key while the info.json upload is in flight, after the conflict check passed.
		const api = synchronizer().api();
		const realPut = api.put.bind(api);
		let lateNoteId = '';
		const putSpy = jest.spyOn(api, 'put').mockImplementation(async (path, content, options) => {
			if (path === 'info.json' && !lateNoteId) lateNoteId = (await Note.save({ title: 'late', body: 'late body', is_locked: 1 }, { useNoteLock: true })).id;
			return realPut(path, content, options);
		});
		try {
			await expect(synchronizerStart(null, { throwOnError: true })).rejects.toMatchObject({ code: ErrorCode.NoteLockKeyConflict });
		} finally {
			putSpy.mockRestore();
		}

		expect(NoteLockKey.instance().load()).toEqual(localKey);
		expect(noteLockKeyConflict()?.noteLockKey).toEqual(remoteKey);
		const key = await NoteLockKey.instance().decrypt('222222');
		expect((await NoteLockNote.decryptBody(await Note.load(lateNoteId), key)).body).toBe('late body');
	});

	it('should keep a reset that lands mid-sync for the next sync instead of clearing its flag', async () => {
		await NoteLockKey.instance().create('111111');
		await synchronizerStart();

		await switchToClient(2);
		await synchronizerStart();
		let resetKey: MasterKeyEntity = null;
		duringTheLockedNotesCheck(async () => { resetKey = await NoteLockSession.instance().reset('222222'); });
		await synchronizerStart(null, { throwOnError: true });

		expect(NoteLockKey.instance().load()).toEqual(resetKey);
		expect(Setting.value('noteLock.passwordReset')).toBe(true);
		await synchronizerStart(null, { throwOnError: true });
		expect(await remoteNoteLockKeyId()).toBe(resetKey.id);
		expect(Setting.value('noteLock.passwordReset')).toBe(false);
	});

	it('should not spend a leftover reset flag on a key that moved mid-sync', async () => {
		await NoteLockKey.instance().create('111111');
		await synchronizerStart();

		await switchToClient(2);
		await synchronizerStart();
		// A flag left behind by an interrupted earlier sync.
		Setting.setValue('noteLock.passwordReset', true);
		let resetKey: MasterKeyEntity = null;
		duringTheLockedNotesCheck(async () => { resetKey = await NoteLockSession.instance().reset('222222'); });

		await expect(synchronizerStart(null, { throwOnError: true })).rejects.toThrow('changed on this device');
		expect(Setting.value('noteLock.passwordReset')).toBe(true);
		await synchronizerStart(null, { throwOnError: true });
		expect(await remoteNoteLockKeyId()).toBe(resetKey.id);
		expect(Setting.value('noteLock.passwordReset')).toBe(false);
	});

	it('should hand a reset that lands after the local save the key the sync target holds', async () => {
		await NoteLockKey.instance().create('111111');
		await synchronizerStart();

		await switchToClient(2);
		await synchronizerStart();
		const firstResetKey = await NoteLockSession.instance().reset('222222');
		// Resets again while the sync is finishing up, after the merged info was saved locally.
		const handler = synchronizer().lockHandler();
		const realReleaseLock = handler.releaseLock.bind(handler);
		let secondResetKey: MasterKeyEntity = null;
		const spy = jest.spyOn(handler, 'releaseLock').mockImplementation(async (...args) => {
			spy.mockRestore();
			secondResetKey = await NoteLockSession.instance().reset('333333');
			return realReleaseLock(...args);
		});
		await synchronizerStart(null, { throwOnError: true });

		expect(await remoteNoteLockKeyId()).toBe(firstResetKey.id);
		expect(Setting.value('noteLock.passwordReset')).toBe(true);
		expect(Setting.value('noteLock.keyIdToReset')).toBe(firstResetKey.id);
		await synchronizerStart(null, { throwOnError: true });
		expect(await remoteNoteLockKeyId()).toBe(secondResetKey.id);
		expect(Setting.value('noteLock.passwordReset')).toBe(false);
	});

	it('should back up the key the target holds when a sync finishes while a second reset is generating its key', async () => {
		await NoteLockKey.instance().create('111111');
		await synchronizerStart();

		await switchToClient(2);
		await synchronizerStart();
		const firstResetKey = await NoteLockSession.instance().reset('222222');
		const service = encryptionService();
		const realGenerate = service.generateMasterKey.bind(service);
		const spy = jest.spyOn(service, 'generateMasterKey').mockImplementation(async (...args) => {
			spy.mockRestore();
			await synchronizerStart(null, { throwOnError: true });
			return realGenerate(...args);
		});
		const secondResetKey = await NoteLockSession.instance().reset('333333');

		expect(Setting.value('noteLock.keyIdToReset')).toBe(firstResetKey.id);
		await synchronizerStart(null, { throwOnError: true });
		expect(await remoteNoteLockKeyId()).toBe(secondResetKey.id);
	});

	it('should adopt the sync target key in the sync that first uses a local master key', async () => {
		const remoteKey = await NoteLockKey.instance().create('111111');
		await synchronizerStart();

		await switchToClient(2);
		await setupAndEnableEncryption(encryptionService(), await loadEncryptionMasterKey());
		await synchronizerStart(null, { throwOnError: true });

		expect(NoteLockKey.instance().load()).toEqual(remoteKey);
	});

	it('should keep a password change that lands during the info upload', async () => {
		await NoteLockKey.instance().create('111111');
		await synchronizerStart();

		await switchToClient(2);
		await synchronizerStart();

		await switchToClient(1);
		await NoteLockKey.instance().changePassword('111111', '222222');
		await synchronizerStart();

		await switchToClient(2);
		const api = synchronizer().api();
		const realPut = api.put.bind(api);
		const putSpy = jest.spyOn(api, 'put').mockImplementation(async (path, content, options) => {
			if (path === 'info.json') {
				putSpy.mockRestore();
				await NoteLockKey.instance().changePassword('111111', '333333');
			}
			return realPut(path, content, options);
		});
		try {
			await expect(synchronizerStart(null, { throwOnError: true })).rejects.toThrow('changed on this device');
		} finally {
			putSpy.mockRestore();
		}

		await expect(NoteLockKey.instance().decrypt('333333')).resolves.toBeTruthy();
	});

	it('should not park the key again when the migration finishes while a sync is in flight', async () => {
		Setting.setValue('featureFlag.noteLock', true);
		const remoteKey = await NoteLockKey.instance().create('111111');
		await synchronizerStart();

		await switchToClient(2);
		Setting.setValue('featureFlag.noteLock', true);
		await NoteLockKey.instance().create('222222');
		await NoteLockSession.instance().unlock('222222');
		await Note.save({ title: 'secret', body: 'secret body', is_locked: 1 }, { useNoteLock: true });
		await expect(synchronizerStart(null, { throwOnError: true })).rejects.toMatchObject({ code: ErrorCode.NoteLockKeyConflict });
		await migrateLockedNotes('222222', '111111');
		duringTheLockedNotesCheck(() => finishNoteLockKeyMigration(false));

		await expect(synchronizerStart(null, { throwOnError: true })).rejects.toThrow('changed on this device');
		expect(noteLockKeyConflict()).toBeNull();
		expect(NoteLockKey.instance().load()).toEqual(remoteKey);
		await synchronizerStart(null, { throwOnError: true });
		expect(await remoteNoteLockKeyId()).toBe(remoteKey.id);
	});

	it('should stop the sync when a note lock key has no sync migration id', async () => {
		await NoteLockKey.instance().create('111111');
		await synchronizerStart();

		const remoteInfo = await fetchSyncInfo(fileApi());
		remoteInfo.syncMigrationId = '';
		await fileApi().put('info.json', remoteInfo.serialize());
		await expect(synchronizerStart(null, { throwOnError: true })).rejects.toThrow('migration ID');

		const localInfo = localSyncInfo();
		localInfo.syncMigrationId = '';
		saveLocalSyncInfo(localInfo);
		await expect(synchronizerStart(null, { throwOnError: true })).rejects.toThrow('migration ID');
	});
});
