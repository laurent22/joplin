import { Crypto, CryptoBuffer, Digest, EncryptionResult, EncryptionParameters, CipherAlgorithm } from './types';
import { webcrypto } from 'crypto';
import { Buffer } from 'buffer';

const pbkdf2Raw = async (password: string, salt: Uint8Array, iterations: number, keylenBytes: number, digest: Digest) => {
	const encoder = new TextEncoder();
	const key = await webcrypto.subtle.importKey(
		'raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits'],
	);
	return Buffer.from(await webcrypto.subtle.deriveBits(
		{ name: 'PBKDF2', salt, iterations, hash: digest }, key, keylenBytes * 8,
	));
};

const loadEncryptDecryptKey = async (keyData: Uint8Array) => {
	return await webcrypto.subtle.importKey(
		'raw',
		keyData,
		{ name: 'AES-GCM' },
		false,
		['encrypt', 'decrypt'],
	);
};

const encryptRaw = async (data: Uint8Array, key: Uint8Array, iv: Uint8Array, authTagLengthBytes: number, additionalData: Uint8Array) => {
	const loadedKey = await loadEncryptDecryptKey(key);
	return Buffer.from(await webcrypto.subtle.encrypt({
		name: 'AES-GCM',
		iv,
		additionalData,
		tagLength: authTagLengthBytes * 8,
	}, loadedKey, data));
};

const decryptRaw = async (data: Uint8Array, key: Uint8Array, iv: Uint8Array, authTagLengthBytes: number, associatedData: Uint8Array) => {
	const loadedKey = await loadEncryptDecryptKey(key);
	return Buffer.from(await webcrypto.subtle.decrypt({
		name: 'AES-GCM',
		iv,
		additionalData: associatedData,
		tagLength: authTagLengthBytes * 8,
	}, loadedKey, data));
};

const validateEncryptionParameters = ({ cipherAlgorithm }: EncryptionParameters) => {
	if (cipherAlgorithm !== CipherAlgorithm.AES_256_GCM) {
		throw new Error(`Unsupported cipherAlgorithm: ${cipherAlgorithm}. Must be AES 256 GCM.`);
	}
};

const crypto: Crypto = {

	randomBytes: async (size: number) => {
		// .getRandomValues has a maximum output size
		const maxChunkSize = 65536;
		const result = new Uint8Array(size);

		if (size < maxChunkSize) {
			webcrypto.getRandomValues(result);
		} else {
			const fullSizeChunk = new Uint8Array(maxChunkSize);
			for (let offset = 0; offset < size; offset += maxChunkSize) {
				const chunk = offset + maxChunkSize > size ? new Uint8Array(size - offset) : fullSizeChunk;
				webcrypto.getRandomValues(chunk);
				result.set(chunk, offset);
			}
		}
		return Buffer.from(result);
	},

	encrypt: async (password: string, salt: CryptoBuffer, data: CryptoBuffer, encryptionParameters: EncryptionParameters) => {
		validateEncryptionParameters(encryptionParameters);

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
		validateEncryptionParameters(encryptionParameters);

		const salt = Buffer.from(data.salt, 'base64');
		const iv = Buffer.from(data.iv, 'base64');

		const key = await pbkdf2Raw(password, salt, encryptionParameters.iterationCount, encryptionParameters.keyLength, encryptionParameters.digestAlgorithm);
		const decrypted = decryptRaw(Buffer.from(data.ct, 'base64'), key, iv, encryptionParameters.authTagLength, encryptionParameters.associatedData);

		return decrypted;
	},

	encryptString: async (password: string, salt: CryptoBuffer, data: string, encoding: BufferEncoding, encryptionParameters: EncryptionParameters) => {
		return crypto.encrypt(password, salt, Buffer.from(data, encoding), encryptionParameters);
	},
};

export default crypto;
