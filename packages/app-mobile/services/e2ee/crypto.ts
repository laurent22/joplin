import { Crypto } from '@joplin/lib/services/e2ee/types';
import crypto from 'react-native-quick-crypto';
import { HashAlgorithm } from 'react-native-quick-crypto/lib/typescript/keys';

const cryptoLib: Crypto = {

	getCiphers: (): string[] => {
		return crypto.getCiphers();
	},

	getHashes: (): string[] => {
		return crypto.getHashes();
	},

	randomBytes: async (size: number): Promise<Uint8Array> => {
		return new Promise((resolve, reject) => {
			crypto.randomBytes(size, (error, result) => {
				if (error) {
					reject(error);
				} else {
					resolve(result);
				}
			});
		});
	},

	pbkdf2Raw: async (password: string, salt: Uint8Array, iterations: number, keylen: number, digest: string): Promise<Uint8Array> => {
		const digestMap: { [key: string]: HashAlgorithm } = {
			'sha1': 'SHA-1',
			'sha224': 'SHA-224',
			'sha256': 'SHA-256',
			'sha384': 'SHA-384',
			'sha512': 'SHA-512',
			'ripemd160': 'RIPEMD-160',
		};
		const digestAlgorithm: string = digestMap[digest.toLowerCase()] || digest;
		return new Promise((resolve, reject) => {
			crypto.pbkdf2(password, salt, iterations, keylen, digestAlgorithm as HashAlgorithm, (error, result) => {
				if (error) {
					reject(error);
				} else {
					resolve(result);
				}
			});
		});
	},
};

export default cryptoLib;
