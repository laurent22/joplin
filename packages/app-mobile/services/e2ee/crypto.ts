import { Crypto, CryptoBuffer, HashAlgorithm } from '@joplin/lib/services/e2ee/types';
import QuickCrypto from 'react-native-quick-crypto';

const crypto: Crypto = {

	getCiphers: (): string[] => {
		return QuickCrypto.getCiphers();
	},

	getHashes: (): string[] => {
		return QuickCrypto.getHashes();
	},

	randomBytes: async (size: number): Promise<CryptoBuffer> => {
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

	pbkdf2Raw: async (password: string, salt: CryptoBuffer, iterations: number, keylen: number, digest: HashAlgorithm): Promise<CryptoBuffer> => {
		return new Promise((resolve, reject) => {
			QuickCrypto.pbkdf2(password, salt, iterations, keylen, digest, (error, result) => {
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
