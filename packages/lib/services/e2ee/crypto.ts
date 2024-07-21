import { Crypto, HashAlgorithm } from './types';
import { promisify } from 'util';
import {
	getCiphers as nodeGetCiphers, getHashes as nodeGetHashes,
	randomBytes as nodeRandomBytes,
	pbkdf2 as nodePbkdf2,
} from 'crypto';

type NodeDigestNameMap = Record<HashAlgorithm, string>;

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

	pbkdf2Raw: async (password: string, salt: Buffer, iterations: number, keylen: number, digest: HashAlgorithm): Promise<Buffer> => {
		const digestMap: NodeDigestNameMap = {
			'SHA-1': 'sha1',
			'SHA-224': 'sha224',
			'SHA-256': 'sha256',
			'SHA-384': 'sha384',
			'SHA-512': 'sha512',
			'RIPEMD-160': 'ripemd160',
		};
		const digestAlgorithm = digestMap[digest];

		const pbkdf2Async = promisify(nodePbkdf2);
		return pbkdf2Async(password, salt, iterations, keylen, digestAlgorithm);
	},
};

export default crypto;
