import { _ } from '@joplin/lib/locale';
import { Crypto, CryptoBuffer, Digest, CipherAlgorithm, EncryptionResult } from '@joplin/lib/services/e2ee/types';
import QuickCrypto from 'react-native-quick-crypto';
import { HashAlgorithm } from 'react-native-quick-crypto/lib/typescript/keys';
import type { CipherCCMOptions, CipherCCM, DecipherCCM, CipherGCMOptions, CipherGCM, DecipherGCM } from 'crypto';

type DigestNameMap = Record<Digest, HashAlgorithm>;

const crypto: Crypto = {

	getCiphers: () => {
		return QuickCrypto.getCiphers();
	},

	getHashes: () => {
		return QuickCrypto.getHashes();
	},

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

	pbkdf2Raw: async (password: string, salt: CryptoBuffer, iterations: number, keylen: number, digest: Digest) => {
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
	},

	encryptRaw: (data: CryptoBuffer, algorithm: CipherAlgorithm, key: CryptoBuffer, iv: CryptoBuffer | null, authTagLength: number, associatedData: CryptoBuffer | null) => {
		if (associatedData === null) {
			associatedData = Buffer.alloc(0);
		}

		let cipher = null;
		if (algorithm === CipherAlgorithm.AES_128_GCM || algorithm === CipherAlgorithm.AES_192_GCM || algorithm === CipherAlgorithm.AES_256_GCM) {
			cipher = QuickCrypto.createCipheriv(algorithm, key, iv, { authTagLength: authTagLength } as CipherGCMOptions) as CipherGCM;
			iv = iv || QuickCrypto.randomBytes(12); // "For IVs, it is recommended that implementations restrict support to the length of 96 bits, to promote interoperability, efficiency, and simplicity of design." - NIST SP 800-38D
		} else if (algorithm === CipherAlgorithm.AES_128_CCM || algorithm === CipherAlgorithm.AES_192_CCM || algorithm === CipherAlgorithm.AES_256_CCM) {
			cipher = QuickCrypto.createCipheriv(algorithm, key, iv, { authTagLength: authTagLength } as CipherCCMOptions) as CipherCCM;
			iv = iv || QuickCrypto.randomBytes(13); // 13 is the maximum IV length for CCM mode - https://nodejs.org/docs/latest-v20.x/api/crypto.html#ccm-mode
		} else {
			throw new Error(_('Unknown cipher algorithm: %s', algorithm));
		}

		cipher.setAAD(associatedData, { plaintextLength: Buffer.byteLength(data) });

		const encryptedData = Buffer.concat([cipher.update(data), cipher.final()]);
		const authTag = cipher.getAuthTag();

		return Buffer.concat([encryptedData, authTag]);
	},

	decryptRaw: (data: CryptoBuffer, algorithm: CipherAlgorithm, key: CryptoBuffer, iv: CryptoBuffer, authTagLength: number, associatedData: CryptoBuffer | null) => {
		if (associatedData === null) {
			associatedData = Buffer.alloc(0);
		}

		let decipher = null;
		if (algorithm === CipherAlgorithm.AES_128_GCM || algorithm === CipherAlgorithm.AES_192_GCM || algorithm === CipherAlgorithm.AES_256_GCM) {
			decipher = QuickCrypto.createDecipheriv(algorithm, key, iv, { authTagLength: authTagLength } as CipherGCMOptions) as DecipherGCM;
		} else if (algorithm === CipherAlgorithm.AES_128_CCM || algorithm === CipherAlgorithm.AES_192_CCM || algorithm === CipherAlgorithm.AES_256_CCM) {
			decipher = QuickCrypto.createDecipheriv(algorithm, key, iv, { authTagLength: authTagLength } as CipherCCMOptions) as DecipherCCM;
		} else {
			throw new Error(_('Unknown decipher algorithm: %s', algorithm));
		}

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
	},

	encrypt: async (password: string, iterationCount: number, salt: CryptoBuffer | null, data: CryptoBuffer) => {

		// default encryption parameters
		const cipherAlgorithm = CipherAlgorithm.AES_256_GCM;
		const authTagLength = 16;
		const digest = Digest.sha512;
		const keySize = 32; // For CipherAlgorithm.AES_256_GCM, 256 bits -> 32 bytes

		// default encryption parameters won't appear in result
		const result: EncryptionResult = {
			iter: iterationCount,
			salt: '',
			iv: '',
			ct: '', // cipherText
		};
		salt = salt || await crypto.randomBytes(32); // 256 bits
		const iv = await crypto.randomBytes(12); // 96 bits

		const key = await crypto.pbkdf2Raw(password, salt, iterationCount, keySize, digest);
		const encrypted = crypto.encryptRaw(data, cipherAlgorithm, key, iv, authTagLength, null);

		result.salt = salt.toString('base64');
		result.iv = iv.toString('base64');
		result.ct = encrypted.toString('base64');

		return result;
	},

	decrypt: async (password: string, data: EncryptionResult) => {

		// default encryption parameters
		const cipherAlgorithm = data.algo || CipherAlgorithm.AES_256_GCM;
		const authTagLength = data.ts || 16;
		const digest = data.digest || Digest.sha512;
		const keySize = 32; // For CipherAlgorithm.AES_256_GCM, 256 bits -> 32 bytes

		const salt = Buffer.from(data.salt, 'base64');
		const iv = Buffer.from(data.iv, 'base64');

		const key = await crypto.pbkdf2Raw(password, salt, data.iter, keySize, digest);
		const decrypted = crypto.decryptRaw(Buffer.from(data.ct, 'base64'), cipherAlgorithm, key, iv, authTagLength, null);

		return decrypted;
	},

	encryptString: async (password: string, iterationCount: number, salt: CryptoBuffer | null, data: string, encoding: BufferEncoding) => {
		return crypto.encrypt(password, iterationCount, salt, Buffer.from(data, encoding));
	},
};

export default crypto;
