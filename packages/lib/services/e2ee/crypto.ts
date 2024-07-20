import { Crypto } from './types';
import { promisify } from 'util';
import {
	getCiphers as nodeGetCiphers, getHashes as nodeGetHashes,
	randomBytes as nodeRandomBytes,
	pbkdf2 as nodePbkdf2,
} from 'crypto';

const crypto: Crypto = {

	getCiphers: (): string[] => {
		return nodeGetCiphers();
	},

	getHashes: (): string[] => {
		return nodeGetHashes();
	},

	randomBytes: async (size: number): Promise<Buffer> => {
		const randomBytesAsync = promisify(nodeRandomBytes);
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

		const pbkdf2Async = promisify(nodePbkdf2);
		return pbkdf2Async(password, salt, iterations, keylen, digestAlgorithm);
	},
};

export default crypto;
