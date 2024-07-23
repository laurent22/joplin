import { Crypto, CryptoBuffer, Digest } from '@joplin/lib/services/e2ee/types';
import QuickCrypto from 'react-native-quick-crypto';
import { HashAlgorithm } from 'react-native-quick-crypto/lib/typescript/keys';

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
};

export default crypto;
