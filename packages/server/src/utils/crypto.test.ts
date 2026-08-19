import { randomBytes } from 'crypto';
import { decryptMFASecret, encryptMFASecret } from './crypto';

describe('crypto', () => {

	it('should be able to encrypt and decrypt and return to same value', () => {

		const secret = randomBytes(32).toString('hex');

		const message = 'hello world';

		const resultEncryption = encryptMFASecret(Buffer.from(message), secret);

		const resultDecrypt = decryptMFASecret(resultEncryption, secret);

		expect(resultDecrypt.toString()).toEqual(message);
	});

});
