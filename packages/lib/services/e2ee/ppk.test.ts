import { afterAllCleanUp, setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import { generateKeyPair } from './ppk';

describe('e2ee/ppk', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	afterAll(async () => {
		await afterAllCleanUp();
	});

	it('should create a public private key pair', async () => {
		const ppk = generateKeyPair();

		expect(ppk.privateKey).toContain('BEGIN RSA PRIVATE KEY');
		expect(ppk.privateKey).toContain('END RSA PRIVATE KEY');
		expect(ppk.privateKey.length).toBeGreaterThan(350);

		expect(ppk.publicKey).toContain('BEGIN RSA PUBLIC KEY');
		expect(ppk.publicKey).toContain('END RSA PUBLIC KEY');
		expect(ppk.publicKey.length).toBeGreaterThan(350);
	});

	it('should create different key pairs every time', async () => {
		const ppk1 = generateKeyPair();
		const ppk2 = generateKeyPair();
		expect(ppk1.privateKey).not.toBe(ppk2.privateKey);
		expect(ppk1.publicKey).not.toBe(ppk2.publicKey);
	});

});
