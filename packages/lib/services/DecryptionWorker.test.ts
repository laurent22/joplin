import { setupDatabaseAndSynchronizer, switchClient, decryptionWorker } from '../testing/test-utils';
import BaseItem from '../models/BaseItem';
import Note from '../models/Note';

describe('services/DecryptionWorker', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	afterEach(() => {
		jest.restoreAllMocks();
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

	it('should skip a note that was decrypted on demand after the worker loaded it', async () => {
		const note = await Note.save({ title: 'Test note', body: 'Test body' });
		const encryptedSnapshot = { ...note, encryption_applied: 1, encryption_cipher_text: 'cipher text' };
		const worker = decryptionWorker();

		jest.spyOn(worker.encryptionService(), 'loadedMasterKeysCount').mockReturnValue(1);
		jest.spyOn(BaseItem, 'itemsThatNeedDecryption').mockResolvedValue({
			items: [encryptedSnapshot],
			hasMore: false,
		});
		const decryptSpy = jest.spyOn(Note, 'decrypt');

		const result = await worker.start();

		expect(decryptSpy).not.toHaveBeenCalled();
		expect(result.decryptedItemCount).toBe(1);
	});
});
