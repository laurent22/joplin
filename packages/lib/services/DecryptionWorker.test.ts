import BaseItem from '../models/BaseItem';
import MasterKey from '../models/MasterKey';
import Note from '../models/Note';
import { setupDatabaseAndSynchronizer, switchClient, decryptionWorker, encryptionService } from '../testing/test-utils';
import { EncryptionMethod } from './e2ee/EncryptionService';
import { setActiveMasterKeyId, setEncryptionEnabled } from './synchronizer/syncInfoUtils';

describe('services/DecryptionWorker', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		setEncryptionEnabled(true);
	});

	it('should not return null when a call to .start is cancelled', async () => {
		const worker = decryptionWorker();

		// Both calls should return a valid DecryptionResult, even if the
		// queue skips one task due to concurrency.
		const results = await Promise.all([
			worker.start(),
			worker.start(),
		]);

		for (const result of results) {
			expect(result === null).toBe(false);
			expect(result === undefined).toBe(false);
			expect(result).toHaveProperty('error');
		}
	});

	it('should populate testCipher if not populated, after successful item decryption', async () => {
		const mk = await encryptionService(1).generateMasterKey('password', {
			encryptionMethod: EncryptionMethod.SJCL4,
		});
		mk.testCipher = null;
		const masterKey = await MasterKey.save(mk);
		await encryptionService(1).loadMasterKey(masterKey, 'password');
		setActiveMasterKeyId(masterKey.id);
		const note = await Note.save({ title: 'test', body: 'hello' });
		await Note.save(await Note.unserialize(await BaseItem.serializeForSync(note)));

		const worker = decryptionWorker(1);
		worker.setEncryptionService(encryptionService(1));
		await worker.start();

		const updatedMasterKey = await MasterKey.load(mk.id);
		expect(updatedMasterKey.testCipher).toBeDefined();
	});

	it('should not populate testCipher if not populated, after failed item decryption', async () => {
		const mk = await encryptionService(1).generateMasterKey('password', {
			encryptionMethod: EncryptionMethod.SJCL4,
		});
		mk.testCipher = null;
		const masterKey = await MasterKey.save(mk);
		await encryptionService(1).loadMasterKey(masterKey, 'password');
		setActiveMasterKeyId(masterKey.id);
		const note = await Note.save({ title: 'test', body: 'hello' });
		await Note.save(await Note.unserialize(await BaseItem.serializeForSync(note)));

		// Manipulate the master key content to use a different key, so it wont decrypt the note
		const mk2 = await encryptionService(1).generateMasterKey('password', {
			encryptionMethod: EncryptionMethod.SJCL4,
		});
		masterKey.content = mk2.content;

		await encryptionService(1).unloadMasterKey(masterKey);
		await encryptionService(1).loadMasterKey(masterKey, 'password');
		setActiveMasterKeyId(masterKey.id);

		const worker = decryptionWorker(1);
		worker.setEncryptionService(encryptionService(1));
		await worker.start();

		const updatedMasterKey = await MasterKey.load(mk.id);
		expect(updatedMasterKey.testCipher).toBeNull();
	});
});
