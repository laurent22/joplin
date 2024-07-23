import { Crypto, Digest } from './types';
import { promisify } from 'util';
import {
	getCiphers as nodeGetCiphers, getHashes as nodeGetHashes,
	randomBytes as nodeRandomBytes,
	pbkdf2 as nodePbkdf2,
} from 'crypto';

const crypto: Crypto = {

	getCiphers: () => {
		return nodeGetCiphers();
	},

	getHashes: () => {
		return nodeGetHashes();
	},

	randomBytes: async (size: number) => {
		const randomBytesAsync = promisify(nodeRandomBytes);
		return randomBytesAsync(size);
	},

	pbkdf2Raw: async (password: string, salt: Buffer, iterations: number, keylen: number, digest: Digest) => {
		const pbkdf2Async = promisify(nodePbkdf2);
		return pbkdf2Async(password, salt, iterations, keylen, digest);
	},
};

export default crypto;
