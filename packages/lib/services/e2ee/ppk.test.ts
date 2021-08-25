import { afterAllCleanUp, encryptionService, setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import { decryptPrivateKey, generateKeyPair } from './ppk';

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

		const privateKey = await decryptPrivateKey(encryptionService(), ppk.privateKey, '111111');
		const publicKey = ppk.publicKey;

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

		const privateKey1 = await decryptPrivateKey(encryptionService(), ppk1.privateKey, '111111');
		const privateKey2 = await decryptPrivateKey(encryptionService(), ppk2.privateKey, '111111');
		const publicKey1 = ppk1.publicKey;
		const publicKey2 = ppk2.publicKey;

		expect(privateKey1).not.toBe(privateKey2);
		expect(publicKey1).not.toBe(publicKey2);
	});

});
