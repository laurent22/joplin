import { CryptoInterface } from './types';
import { promisify } from 'util';
import crypto = require('crypto');

const Crypto: CryptoInterface = {

	getCiphers: (): string[] => {
		return crypto.getCiphers();
	},

	getHashes: (): string[] => {
		return crypto.getHashes();
	},

	randomBytes: async (size: number): Promise<Buffer> => {
		const randomBytesAsync = promisify(crypto.randomBytes);
		return randomBytesAsync(size);
	},

	pbkdf2Raw: async (password: string, salt: Buffer, iterations: number, keylen: number, digest: string): Promise<Buffer> => {
		const digestMap: { [key: string]: string } = {
			'sha-1': 'sha1',
			'sha-224': 'sha224',
			'sha-256': 'sha256',
			'sha-384': 'sha384',
			'sha-512': 'sha512',
			'ripemd-160': 'ripemd160',
		};
		const digestAlgorithm: string = digestMap[digest.toLowerCase()] || digest;

		const pbkdf2Async = promisify(crypto.pbkdf2);
		return pbkdf2Async(password, salt, iterations, keylen, digestAlgorithm);
	},
};

export default Crypto;
