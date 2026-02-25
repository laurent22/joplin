import { setupDatabaseAndSynchronizer, switchClient, decryptionWorker } from '../testing/test-utils';

describe('services/DecryptionWorker', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('concurrent start() calls should not crash with null result', async () => {
		const worker = decryptionWorker();

		// Both calls should return a valid DecryptionResult, even if the
		// queue skips one task due to concurrency.
		const results = await Promise.all([
			worker.start(),
			worker.start(),
		]);

		for (const result of results) {
			expect(result).not.toBeNull();
			expect(result).toHaveProperty('error');
		}
	});
});
