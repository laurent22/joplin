import { Crypto, CryptoBuffer, Digest, CipherAlgorithm, EncryptionResult, EncryptionParameters } from '@joplin/lib/services/e2ee/types';
import QuickCrypto from 'react-native-quick-crypto';
import { HashAlgorithm } from 'react-native-quick-crypto/lib/typescript/keys';
import type { CipherGCMOptions, CipherGCM, DecipherGCM } from 'crypto';

const nonceCounterLength = 8;
const nonceTimestampLength = 7;

const pbkdf2Raw = (password: string, salt: CryptoBuffer, iterations: number, keylen: number, digest: Digest): Promise<CryptoBuffer> => {
	return new Promise((resolve, reject) => {
		QuickCrypto.pbkdf2(password, salt, iterations, keylen, digest as HashAlgorithm, (error, result) => {
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

	const encryptedData = [cipher.update(data), cipher.final()];
	const authTag = cipher.getAuthTag();

	return Buffer.concat([encryptedData[0], encryptedData[1], authTag]);
};

const decryptRaw = (data: CryptoBuffer, algorithm: CipherAlgorithm, key: CryptoBuffer, iv: CryptoBuffer, authTagLength: number, associatedData: CryptoBuffer) => {

	const decipher = QuickCrypto.createDecipheriv(algorithm, key, iv, { authTagLength: authTagLength } as CipherGCMOptions) as DecipherGCM;

	const authTag = data.subarray(-authTagLength);
	const encryptedData = data.subarray(0, data.byteLength - authTag.byteLength);
	decipher.setAuthTag(authTag);
	decipher.setAAD(associatedData, { plaintextLength: Buffer.byteLength(data) });

	try {
		return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
	} catch (error) {
		throw new Error(`Authentication failed! ${error}`);
	}
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

	digest: async (algorithm: Digest, data: Uint8Array) => {
		const hash = QuickCrypto.createHash(algorithm);
		hash.update(data);
		return hash.digest();
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

	generateNonce: async (nonce: Uint8Array) => {
		const randomLength = nonce.length - nonceTimestampLength - nonceCounterLength;
		if (randomLength < 1) {
			throw new Error(`Nonce length should be greater than ${(nonceTimestampLength + nonceCounterLength) * 8} bits`);
		}
		nonce.set(await crypto.randomBytes(randomLength));
		const timestampArray = new Uint8Array(nonceTimestampLength);
		let timestamp = Date.now();
		for (let i = 0; i < nonceTimestampLength; i++) {
			timestampArray[i] = timestamp & 0xFF;
			timestamp >>= 8;
		}
		nonce.set(timestampArray, randomLength);
		nonce.set(new Uint8Array(nonceCounterLength), randomLength + nonceTimestampLength);
		return nonce;
	},

	increaseNonce: async (nonce: Uint8Array) => {
		const carry = 1;
		const end = nonce.length - nonceCounterLength;
		let i = nonce.length;
		while (i-- > end) {
			nonce[i] += carry;
			if (nonce[i] !== 0 || carry !== 1) {
				break;
			}
		}
		if (i < end) {
			await crypto.generateNonce(nonce);
		}
		return nonce;
	},
};

export default crypto;
