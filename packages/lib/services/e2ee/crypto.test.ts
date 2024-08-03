import { afterAllCleanUp, expectNotThrow, setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import { runIntegrationTests } from './cryptoTestUtils';

describe('e2ee/ppk', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	afterAll(async () => {
		await afterAllCleanUp();
	});

	it('should decrypt and encrypt data from different devices', (async () => {
		await expectNotThrow(async () => runIntegrationTests(true));
	}));

});
