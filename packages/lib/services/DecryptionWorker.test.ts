import { setupDatabaseAndSynchronizer, switchClient, decryptionWorker } from '../testing/test-utils';

describe('services/DecryptionWorker', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
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
});
