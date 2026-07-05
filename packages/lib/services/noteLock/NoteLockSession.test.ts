import { afterAllCleanUp, encryptionService, setupDatabaseAndSynchronizer, switchClient, synchronizerStart } from '../../testing/test-utils';
import EncryptionService from '../e2ee/EncryptionService';
import { localSyncInfo, saveLocalSyncInfo } from '../synchronizer/syncInfoUtils';
import NoteLockKey, { DecryptedNoteLockKey } from './NoteLockKey';
import NoteLockSession from './NoteLockSession';
import NoteLockService from './NoteLockService';

const unlockedSession = async (password = '123456') => {
	const session = NoteLockSession.instance();
	await NoteLockKey.instance().create(password);
	await session.unlock(password);
	return session;
};

const changeSyncedKeyId = (id: string) => {
	const syncInfo = localSyncInfo();
	syncInfo.noteLockKey = { ...syncInfo.noteLockKey, id };
	saveLocalSyncInfo(syncInfo);
};

// Gates NoteLockKey.decrypt() so a lock, reset or teardown can be forced to land while an unlock is
// still awaiting. Returns a function that lets the decryption resolve.
const gateDecrypt = (result?: DecryptedNoteLockKey) => {
	let release: ()=> void = () => {};
	const gate = new Promise<void>(resolve => { release = resolve; });
	const key = NoteLockKey.instance();
	const realDecrypt = key.decrypt.bind(key);
	jest.spyOn(key, 'decrypt').mockImplementation(async password => {
		await gate;
		return result ?? realDecrypt(password);
	});
	return release;
};

// Gates generateMasterKey() so a reset can be held mid-rotation, with the old key still persisted,
// while another unlock or reset races it. Returns a function that lets the rotation resolve.
const gateKeyGeneration = () => {
	let release: ()=> void = () => {};
	const gate = new Promise<void>(resolve => { release = resolve; });
	const encryption = EncryptionService.instance();
	const realGenerate = encryption.generateMasterKey.bind(encryption);
	jest.spyOn(encryption, 'generateMasterKey').mockImplementation(async (password, options) => {
		await gate;
		return realGenerate(password, options);
	});
	return release;
};

describe('NoteLockSession', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await setupDatabaseAndSynchronizer(2);
		await switchClient(1);
		NoteLockService.destroyInstance();
		NoteLockSession.destroyInstance();
		NoteLockKey.destroyInstance();
		EncryptionService.instance_ = encryptionService();
	});

	afterAll(async () => {
		await afterAllCleanUp();
	});

	it('should stay locked after create and reset until explicitly unlocked', async () => {
		const session = NoteLockSession.instance();
		const firstKey = await NoteLockKey.instance().create('123456');
		expect(session.isUnlocked()).toBe(false);

		await session.unlock('123456');
		expect(session.isUnlocked()).toBe(true);

		const secondKey = await session.reset('654321');
		expect(secondKey.id).not.toBe(firstKey.id);
		expect(session.isUnlocked()).toBe(false);

		await session.unlock('654321');
		expect(session.isUnlocked()).toBe(true);
	});

	it('should reject an incorrect password and stay locked', async () => {
		const session = NoteLockSession.instance();
		await NoteLockKey.instance().create('123456');
		await expect(session.unlock('wrong password')).rejects.toThrow();
		expect(session.isUnlocked()).toBe(false);
	});

	it('should lock and clear the key', async () => {
		const session = await unlockedSession();
		session.lock();
		expect(session.isUnlocked()).toBe(false);
		expect(() => session.decryptedKey()).toThrow('Note lock session is locked');
	});

	it('should lock when the synced key changes', async () => {
		const session = await unlockedSession();
		changeSyncedKeyId('0123456789abcdef0123456789abcdef');
		expect(session.isUnlocked()).toBe(false);
	});

	it('should stay locked when locked while an unlock is in flight', async () => {
		const session = NoteLockSession.instance();
		await NoteLockKey.instance().create('123456');
		const release = gateDecrypt();

		const unlocking = session.unlock('123456');
		session.lock();
		release();

		await expect(unlocking).rejects.toThrow('locked while unlocking');
		expect(session.isUnlocked()).toBe(false);
	});

	it('should not repopulate the key when destroyed mid-unlock', async () => {
		const session = NoteLockSession.instance();
		await NoteLockKey.instance().create('123456');
		const release = gateDecrypt();

		const unlocking = session.unlock('123456');
		NoteLockSession.destroyInstance();
		release();

		await expect(unlocking).rejects.toThrow('locked while unlocking');
		expect(session.isUnlocked()).toBe(false);
	});

	it('should not install a key that was replaced by sync while unlocking', async () => {
		const session = NoteLockSession.instance();
		const originalKey = await NoteLockKey.instance().create('123456');
		// Generation is unchanged here, but the loaded id no longer matches the decrypted one.
		const release = gateDecrypt({ id: originalKey.id, plainText: 'plaintext' });

		const unlocking = session.unlock('123456');
		changeSyncedKeyId('0123456789abcdef0123456789abcdef');
		release();

		await expect(unlocking).rejects.toThrow('key changed while unlocking');
		expect(session.isUnlocked()).toBe(false);
	});

	it('should not install a key that was reset while unlocking', async () => {
		const session = NoteLockSession.instance();
		const originalKey = await NoteLockKey.instance().create('123456');
		const release = gateDecrypt({ id: originalKey.id, plainText: 'plaintext' });

		const unlocking = session.unlock('123456');
		await session.reset('654321');
		release();

		await expect(unlocking).rejects.toThrow('locked while unlocking');
		expect(session.isUnlocked()).toBe(false);
	});

	it('should reject an old-password unlock that races a reset mid-rotation', async () => {
		const session = await unlockedSession();
		const releaseRotation = gateKeyGeneration();

		const resetting = session.reset('654321');
		await expect(session.unlock('123456')).rejects.toThrow('reset is in progress');
		releaseRotation();
		await resetting;

		expect(session.isUnlocked()).toBe(false);
	});

	it('should reject a reset that overlaps another rotation', async () => {
		const session = await unlockedSession();
		const releaseRotation = gateKeyGeneration();

		const firstReset = session.reset('654321');
		await expect(session.reset('abcdef')).rejects.toThrow('A note lock key reset is already in progress');
		releaseRotation();
		await firstReset;

		expect(session.isUnlocked()).toBe(false);
	});

	it('should sync the encrypted note lock key without auto-unlocking or loading it into the E2EE registry', async () => {
		const createdKey = await NoteLockKey.instance().create('123456');
		NoteLockService.destroyInstance();
		NoteLockSession.destroyInstance();
		NoteLockKey.destroyInstance();
		await synchronizerStart();

		await switchClient(2);
		EncryptionService.instance_ = encryptionService();
		await synchronizerStart();

		expect(NoteLockKey.instance().load()).toEqual(createdKey);
		expect(NoteLockSession.instance().isUnlocked()).toBe(false);
		expect(EncryptionService.instance().loadedMasterKeysCount()).toBe(0);
	});
});
