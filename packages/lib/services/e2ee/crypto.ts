import { Crypto, CryptoBuffer, Digest, EncryptionResult, EncryptionParameters } from './types';
import { webcrypto } from 'crypto';
import { Buffer } from 'buffer';
import {
	generateNonce as generateNonceShared,
	increaseNonce as increaseNonceShared,
	setRandomBytesImplementation,
} from './cryptoShared';

const pbkdf2Raw = async (password: string, salt: Uint8Array, iterations: number, keylenBytes: number, digest: Digest) => {
	const encoder = new TextEncoder();
	const key = await webcrypto.subtle.importKey(
		'raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveKey'],
	);
	return webcrypto.subtle.deriveKey(
		{ name: 'PBKDF2', salt, iterations, hash: digest }, key, { name: 'AES-GCM', length: keylenBytes * 8 }, false, ['encrypt', 'decrypt'],
	);
};

const encryptRaw = async (data: Uint8Array, key: webcrypto.CryptoKey, iv: Uint8Array, authTagLengthBytes: number, additionalData: Uint8Array) => {
	return Buffer.from(await webcrypto.subtle.encrypt({
		name: 'AES-GCM',
		iv,
		additionalData,
		tagLength: authTagLengthBytes * 8,
	}, key, data));
};

const decryptRaw = async (data: Uint8Array, key: webcrypto.CryptoKey, iv: Uint8Array, authTagLengthBytes: number, associatedData: Uint8Array) => {
	return Buffer.from(await webcrypto.subtle.decrypt({
		name: 'AES-GCM',
		iv,
		additionalData: associatedData,
		tagLength: authTagLengthBytes * 8,
	}, key, data));
};

const crypto: Crypto = {

	randomBytes: async (size: number) => {
		// .getRandomValues has a maximum output size
		const maxChunkSize = 65536;
		const result = new Uint8Array(size);

		if (size <= maxChunkSize) {
			webcrypto.getRandomValues(result);
		} else {
			const fullSizeChunk = new Uint8Array(maxChunkSize);
			const lastChunkSize = size % maxChunkSize;
			const maxOffset = size - lastChunkSize;
			let offset = 0;
			while (offset < maxOffset) {
				webcrypto.getRandomValues(fullSizeChunk);
				result.set(fullSizeChunk, offset);
				offset += maxChunkSize;
			}
			if (lastChunkSize > 0) {
				const lastChunk = webcrypto.getRandomValues(new Uint8Array(lastChunkSize));
				result.set(lastChunk, offset);
			}
		}
		return Buffer.from(result);
	},

	digest: async (algorithm: Digest, data: Uint8Array) => {
		return Buffer.from(await webcrypto.subtle.digest(algorithm, data));
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
		const encrypted = await encryptRaw(data, key, iv, encryptionParameters.authTagLength, encryptionParameters.associatedData);

		result.iv = iv.toString('base64');
		result.ct = encrypted.toString('base64');

		return result;
	},

	decrypt: async (password: string, data: EncryptionResult, encryptionParameters: EncryptionParameters) => {

		const salt = Buffer.from(data.salt, 'base64');
		const iv = Buffer.from(data.iv, 'base64');

		const key = await pbkdf2Raw(password, salt, encryptionParameters.iterationCount, encryptionParameters.keyLength, encryptionParameters.digestAlgorithm);
		const decrypted = decryptRaw(Buffer.from(data.ct, 'base64'), key, iv, encryptionParameters.authTagLength, encryptionParameters.associatedData);

		return decrypted;
	},

	encryptString: async (password: string, salt: CryptoBuffer, data: string, encoding: BufferEncoding, encryptionParameters: EncryptionParameters) => {
		return crypto.encrypt(password, salt, Buffer.from(data, encoding), encryptionParameters);
	},

	generateNonce: generateNonceShared,

	increaseNonce: increaseNonceShared,
};

setRandomBytesImplementation(crypto.randomBytes);

export default crypto;
