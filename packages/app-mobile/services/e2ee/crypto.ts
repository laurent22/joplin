import { Crypto, CryptoBuffer, Digest, CipherAlgorithm, EncryptionResult, EncryptionParameters } from '@joplin/lib/services/e2ee/types';
import QuickCrypto from 'react-native-quick-crypto';
import { HashAlgorithm } from 'react-native-quick-crypto/lib/typescript/keys';
import type { CipherGCMOptions, CipherGCM, DecipherGCM } from 'crypto';

type DigestNameMap = Record<Digest, HashAlgorithm>;

const pbkdf2Raw = (password: string, salt: CryptoBuffer, iterations: number, keylen: number, digest: Digest): Promise<CryptoBuffer> => {
	const digestNameMap: DigestNameMap = {
		sha1: 'SHA-1',
		sha224: 'SHA-224',
		sha256: 'SHA-256',
		sha384: 'SHA-384',
		sha512: 'SHA-512',
		ripemd160: 'RIPEMD-160',
	};
	const rnqcDigestName = digestNameMap[digest];

	return new Promise((resolve, reject) => {
		QuickCrypto.pbkdf2(password, salt, iterations, keylen, rnqcDigestName, (error, result) => {
			if (error) {
				reject(error);
			} else {
				resolve(result);
			}
		});
	});
};

const encryptRaw = (data: CryptoBuffer, algorithm: CipherAlgorithm, key: CryptoBuffer, iv: CryptoBuffer, authTagLength: number, associatedData: CryptoBuffer) => {

	const cipher = QuickCrypto.createCipheriv(algorithm, key, iv, { authTagLength: authTagLength } as CipherGCMOptions) as CipherGCM;

	cipher.setAAD(associatedData, { plaintextLength: Buffer.byteLength(data) });

	const encryptedData = Buffer.concat([cipher.update(data), cipher.final()]);
	const authTag = cipher.getAuthTag();

	return Buffer.concat([encryptedData, authTag]);
};

const decryptRaw = (data: CryptoBuffer, algorithm: CipherAlgorithm, key: CryptoBuffer, iv: CryptoBuffer, authTagLength: number, associatedData: CryptoBuffer) => {

	const decipher = QuickCrypto.createDecipheriv(algorithm, key, iv, { authTagLength: authTagLength } as CipherGCMOptions) as DecipherGCM;

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
		return new Promise((resolve, reject) => {
			QuickCrypto.randomBytes(size, (error, result) => {
				if (error) {
					reject(error);
				} else {
					resolve(result);
				}
			});
		});
	},

	encrypt: async (password: string, salt: CryptoBuffer, data: CryptoBuffer, options: EncryptionParameters) => {

		// Parameters in EncryptionParameters won't appear in result
		const result: EncryptionResult = {
			salt: salt.toString('base64'),
			iv: '',
			ct: '', // cipherText
		};

		// 96 bits IV
		// "For IVs, it is recommended that implementations restrict support to the length of 96 bits, to promote interoperability, efficiency, and simplicity of design." - NIST SP 800-38D
		const iv = await crypto.randomBytes(12);

		const key = await pbkdf2Raw(password, salt, options.iterationCount, options.keyLength, options.digestAlgorithm);
		const encrypted = encryptRaw(data, options.cipherAlgorithm, key, iv, options.authTagLength, options.associatedData);

		result.iv = iv.toString('base64');
		result.ct = encrypted.toString('base64');

		return result;
	},

	decrypt: async (password: string, data: EncryptionResult, options: EncryptionParameters) => {

		const salt = Buffer.from(data.salt, 'base64');
		const iv = Buffer.from(data.iv, 'base64');

		const key = await pbkdf2Raw(password, salt, options.iterationCount, options.keyLength, options.digestAlgorithm);
		const decrypted = decryptRaw(Buffer.from(data.ct, 'base64'), options.cipherAlgorithm, key, iv, options.authTagLength, options.associatedData);

		return decrypted;
	},

	encryptString: async (password: string, salt: CryptoBuffer, data: string, encoding: BufferEncoding, options: EncryptionParameters) => {
		return crypto.encrypt(password, salt, Buffer.from(data, encoding), options);
	},
};

export default crypto;
