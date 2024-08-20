import { Crypto, CryptoBuffer, Digest, CipherAlgorithm, EncryptionResult, EncryptionParameters } from './types';
import { promisify } from 'util';
import {
	randomBytes as nodeRandomBytes,
	pbkdf2 as nodePbkdf2,
	createCipheriv, createDecipheriv,
	CipherGCMOptions, CipherGCM, DecipherGCM,
} from 'crypto';

const pbkdf2Raw = (password: string, salt: CryptoBuffer, iterations: number, keylen: number, digest: Digest) => {
	const pbkdf2Async = promisify(nodePbkdf2);
	return pbkdf2Async(password, salt, iterations, keylen, digest);
};

const encryptRaw = (data: CryptoBuffer, algorithm: CipherAlgorithm, key: CryptoBuffer, iv: CryptoBuffer, authTagLength: number, associatedData: CryptoBuffer) => {

	const cipher = createCipheriv(algorithm, key, iv, { authTagLength: authTagLength } as CipherGCMOptions) as CipherGCM;

	cipher.setAAD(associatedData, { plaintextLength: Buffer.byteLength(data) });

	const encryptedData = Buffer.concat([cipher.update(data), cipher.final()]);
	const authTag = cipher.getAuthTag();

	return Buffer.concat([encryptedData, authTag]);
};

const decryptRaw = (data: CryptoBuffer, algorithm: CipherAlgorithm, key: CryptoBuffer, iv: CryptoBuffer, authTagLength: number, associatedData: CryptoBuffer) => {

	const decipher = createDecipheriv(algorithm, key, iv, { authTagLength: authTagLength } as CipherGCMOptions) as DecipherGCM;

	const authTag = data.subarray(-authTagLength);
	const encryptedData = data.subarray(0, data.byteLength - authTag.byteLength);
	decipher.setAuthTag(authTag);
	decipher.setAAD(associatedData, { plaintextLength: Buffer.byteLength(data) });

	let decryptedData = null;
	try {
		decryptedData = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
	} catch (error) {
		throw new Error(`Authentication failed! ${error}`);
	}

	return decryptedData;
};

const crypto: Crypto = {

	randomBytes: async (size: number) => {
		const randomBytesAsync = promisify(nodeRandomBytes);
		return randomBytesAsync(size);
	},

	encrypt: async (password: string, salt: CryptoBuffer, data: CryptoBuffer, encryptionParameters: EncryptionParameters) => {

		// Parameters in EncryptionParameters won't appear in result
		const result: EncryptionResult = {
			salt: salt.toString('base64'),
			iv: '',
			ct: '', // cipherText
		};

		// 96 bits IV
		// "For IVs, it is recommended that implementations restrict support to the length of 96 bits, to promote interoperability, efficiency, and simplicity of design." - NIST SP 800-38D
		const iv = await crypto.randomBytes(12);

		const key = await pbkdf2Raw(password, salt, encryptionParameters.iterationCount, encryptionParameters.keyLength, encryptionParameters.digestAlgorithm);
		const encrypted = encryptRaw(data, encryptionParameters.cipherAlgorithm, key, iv, encryptionParameters.authTagLength, encryptionParameters.associatedData);

		result.iv = iv.toString('base64');
		result.ct = encrypted.toString('base64');

		return result;
	},

	decrypt: async (password: string, data: EncryptionResult, encryptionParameters: EncryptionParameters) => {

		const salt = Buffer.from(data.salt, 'base64');
		const iv = Buffer.from(data.iv, 'base64');

		const key = await pbkdf2Raw(password, salt, encryptionParameters.iterationCount, encryptionParameters.keyLength, encryptionParameters.digestAlgorithm);
		const decrypted = decryptRaw(Buffer.from(data.ct, 'base64'), encryptionParameters.cipherAlgorithm, key, iv, encryptionParameters.authTagLength, encryptionParameters.associatedData);

		return decrypted;
	},

	encryptString: async (password: string, salt: CryptoBuffer, data: string, encoding: BufferEncoding, encryptionParameters: EncryptionParameters) => {
		return crypto.encrypt(password, salt, Buffer.from(data, encoding), encryptionParameters);
	},
};

export default crypto;
