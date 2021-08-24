import { afterAllCleanUp, encryptionService, setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import { decryptKey, generateKeyPair } from './ppk';

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
		const ppk = await generateKeyPair(encryptionService(), '111111');

		const privateKey = await decryptKey(encryptionService(), ppk.privateKey, '111111');
		const publicKey = await decryptKey(encryptionService(), ppk.publicKey, '111111');

		expect(privateKey).toContain('BEGIN RSA PRIVATE KEY');
		expect(privateKey).toContain('END RSA PRIVATE KEY');
		expect(privateKey.length).toBeGreaterThan(350);

		expect(publicKey).toContain('BEGIN RSA PUBLIC KEY');
		expect(publicKey).toContain('END RSA PUBLIC KEY');
		expect(publicKey.length).toBeGreaterThan(350);
	});

	it('should create different key pairs every time', async () => {
		const ppk1 = await generateKeyPair(encryptionService(), '111111');
		const ppk2 = await generateKeyPair(encryptionService(), '111111');

		const privateKey1 = await decryptKey(encryptionService(), ppk1.privateKey, '111111');
		const privateKey2 = await decryptKey(encryptionService(), ppk2.privateKey, '111111');
		const publicKey1 = await decryptKey(encryptionService(), ppk1.publicKey, '111111');
		const publicKey2 = await decryptKey(encryptionService(), ppk2.publicKey, '111111');

		expect(privateKey1).not.toBe(privateKey2);
		expect(publicKey1).not.toBe(publicKey2);
	});

});
