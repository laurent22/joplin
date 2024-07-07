import { NativeEncryptionInterface } from '@joplin/lib/services/e2ee/types';
import crypto from 'react-native-quick-crypto';
import { HashAlgorithm } from 'react-native-quick-crypto/lib/typescript/keys';

class NativeEncryption implements NativeEncryptionInterface {
	public getCiphers(): string[] {
		return crypto.getCiphers();
	}

	public getHashes(): string[] {
		return crypto.getHashes();
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: remove the type "any" here
	public async randomBytes(size: number): Promise<Buffer | any> {
		return new Promise((resolve, reject) => {
			crypto.randomBytes(size, (error, result) => {
				if (error) {
					reject(error);
				} else {
					resolve(result);
				}
			});
		});
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: remove the type "any" here
	public async pbkdf2Raw(password: string, salt: Buffer, iterations: number, keylen: number, digest: string): Promise<Buffer | any> {
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
	}

}

export default NativeEncryption;
