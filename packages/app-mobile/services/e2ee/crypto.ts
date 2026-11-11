import { Crypto, CryptoBuffer, CryptoBufferEncoding, Digest, CipherAlgorithm, EncryptionResult, EncryptionParameters } from '@joplin/lib/services/e2ee/types';
import QuickCrypto from 'react-native-quick-crypto';
import type { CipherGCMOptions, CipherGCM, DecipherGCM } from 'crypto';
import {
	generateNonce as generateNonceShared,
	increaseNonce as increaseNonceShared,
	setRandomBytesImplementation,
} from '@joplin/lib/services/e2ee/cryptoShared';

type DigestNameMap = Record<Digest, string>;
const digestNameMap: DigestNameMap = {
	[Digest.sha1]: 'sha1',
	[Digest.sha256]: 'sha256',
	[Digest.sha384]: 'sha384',
	[Digest.sha512]: 'sha512',
};

const pbkdf2Raw = (password: string, salt: CryptoBuffer | ArrayBuffer, iterations: number, keylen: number, digest: Digest): Promise<CryptoBuffer> => {
	return new Promise((resolve, reject) => {
		QuickCrypto.pbkdf2(password, salt, iterations, keylen, digest, (error, result) => {
			if (error) {
				reject(error);
			} else {
				resolve(result);
			}
		});
	});
};

const encryptRaw = (data: CryptoBuffer, algorithm: CipherAlgorithm, key: CryptoBuffer, iv: CryptoBuffer, authTagLength: number, associatedData: CryptoBuffer) => {

	const cipher = QuickCrypto.createCipheriv(algorithm, key, iv, { authTagLength: authTagLength } as CipherGCMOptions) as unknown as CipherGCM;

	cipher.setAAD(associatedData, { plaintextLength: data.byteLength });

	const encryptedData = [cipher.update(data), cipher.final()];
	const authTag = cipher.getAuthTag();

	return Buffer.concat([encryptedData[0], encryptedData[1], authTag]);
};

const decryptRaw = (data: ArrayBuffer, algorithm: CipherAlgorithm, key: CryptoBuffer, iv: ArrayBuffer, authTagLength: number, associatedData: CryptoBuffer) => {

	const decipher = QuickCrypto.createDecipheriv(algorithm, key, iv, { authTagLength: authTagLength } as CipherGCMOptions) as unknown as DecipherGCM;

	const plaintextLength = data.byteLength - authTagLength;
	const authTag = new Uint8Array(data, plaintextLength, authTagLength);
	const encryptedData = new Uint8Array(data, 0, plaintextLength);
	decipher.setAuthTag(authTag);
	decipher.setAAD(associatedData, { plaintextLength: plaintextLength });

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
		const hash = QuickCrypto.createHash(digestNameMap[algorithm]);
		hash.update(
			// Cast: hash.update accepts TypedArrays, despite its declared types
			data as unknown as ArrayBuffer,
		);
		return hash.digest();
	},

	encrypt: async (password: string, salt: CryptoBuffer, data: CryptoBuffer, encryptionParameters: EncryptionParameters) => {

		// Parameters in EncryptionParameters won't appear in result
		const result: EncryptionResult = {
			salt: crypto.bufferToString(salt, 'base64'),
			iv: '',
			ct: '', // cipherText
		};

		// 96 bits IV
		// "For IVs, it is recommended that implementations restrict support to the length of 96 bits, to promote interoperability, efficiency, and simplicity of design." - NIST SP 800-38D
		const iv = await crypto.randomBytes(12);

		const key = await pbkdf2Raw(password, salt, encryptionParameters.iterationCount, encryptionParameters.keyLength, encryptionParameters.digestAlgorithm);
		const encrypted = encryptRaw(data, encryptionParameters.cipherAlgorithm, key, iv, encryptionParameters.authTagLength, encryptionParameters.associatedData);

		result.iv = crypto.bufferToString(iv, 'base64');
		result.ct = crypto.bufferToString(encrypted, 'base64');

		return result;
	},

	decrypt: async (password: string, data: EncryptionResult, encryptionParameters: EncryptionParameters) => {

		const salt = QuickCrypto.binaryLikeToArrayBuffer(data.salt, 'base64');
		const iv = QuickCrypto.binaryLikeToArrayBuffer(data.iv, 'base64');

		const key = await pbkdf2Raw(password, salt, encryptionParameters.iterationCount, encryptionParameters.keyLength, encryptionParameters.digestAlgorithm);
		const decrypted = decryptRaw(QuickCrypto.binaryLikeToArrayBuffer(data.ct, 'base64'), encryptionParameters.cipherAlgorithm, key, iv, encryptionParameters.authTagLength, encryptionParameters.associatedData);

		return decrypted;
	},

	encryptString: async (password: string, salt: CryptoBuffer, data: string, encoding: CryptoBufferEncoding, encryptionParameters: EncryptionParameters) => {
		return crypto.encrypt(password, salt, new Uint8Array(QuickCrypto.binaryLikeToArrayBuffer(data, encoding)), encryptionParameters);
	},

	bufferToString: (buffer: CryptoBuffer, encoding: CryptoBufferEncoding) => {
		return QuickCrypto.ab2str(buffer.buffer, encoding, buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
	},

	generateNonce: generateNonceShared,

	increaseNonce: increaseNonceShared,
};

setRandomBytesImplementation(crypto.randomBytes);

export default crypto;
