import { RSA } from '@joplin/lib/services/e2ee/types';
import { Buffer } from 'buffer';
import ecbDecrypt from './ecbDecrypt';

interface RSAKeyPair {
	public: CryptoKey;
	private: CryptoKey;
	publicString: string;
	privateString: string;
	keySizeBits: number;
}

const exportKey = async (key: CryptoKey, isPrivate: boolean) => {
	// See https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/exportKey
	const buffer = Buffer.from(await crypto.subtle.exportKey(isPrivate ? 'pkcs8' : 'spki', key));
	const contentBase64 = buffer.toString('base64');
	return `-----BEGIN ${isPrivate ? 'PRIVATE' : 'PUBLIC'} KEY-----\n${contentBase64}\n-----END ${isPrivate ? 'PRIVATE' : 'PUBLIC'} KEY-----`
};

const bufferFromPem = (pemData: string) => {
	const contentMatch = pemData.match(/^[\n ]*-{5}BEGIN (?:RSA )?(?:PUBLIC|PRIVATE) KEY-{5}\n([a-z0-9A-Z/=+\n]*)\n-{5}END (?:RSA )?(?:PUBLIC|PRIVATE) KEY-{5}[\n ]*$/);
	if (!contentMatch) {
		console.log(pemData)
		throw new Error('Data does not seem to be in PEM format.');
	}

	const dataBase64 = contentMatch[1].replace(/\n/g, '');
	return Buffer.from(dataBase64, 'base64').buffer;
};

const algorithmName = 'RSASSA-PKCS1-v1_5';

const rsa: RSA = {

	generateKeyPair: async (keySize: number): Promise<RSAKeyPair> => {
		const keyPair = await crypto.subtle.generateKey({
			name: algorithmName,
			modulusLength: keySize,
			publicExponent: new Uint8Array([1,0,1]),
			hash: 'SHA-256',
		}, true, ['encrypt', 'decrypt']);

		if (!keyPair.privateKey) throw new Error('No private key was generated');
		if (!keyPair.publicKey) throw new Error('No public key was generated');

		return {
			public: keyPair.publicKey,
			private: keyPair.privateKey,
			publicString: await exportKey(keyPair.publicKey, false),
			privateString: await exportKey(keyPair.publicKey, true),
			keySizeBits: keySize,
		};
	},

	loadKeys: async (publicKey: string, privateKey: string, keySizeBits: number): Promise<RSAKeyPair> => {
		let publicKeyData;
		const algorithmInfo = { name: algorithmName, hash: 'SHA-128' };
		const publicKeyBuffer = bufferFromPem(publicKey);
		for (const hashType of [undefined, 'SHA-256', 'SHA-384', 'SHA-512', 'SHA-1', 'SHA-128']) {
			for (const algorithmName of ['RSASSA-PKCS1-v1_5', 'RSA-OAEP', 'RSA-PSS']) {
				algorithmInfo.hash = hashType;
				algorithmInfo.name = algorithmName;
				try {
					publicKeyData = await crypto.subtle.importKey('spki', publicKeyBuffer, algorithmInfo, true, ['encrypt']);
					console.log('success', algorithmInfo);
					break;
				} catch(error) {
					console.warn('for', hashType, algorithmName, error);
				}
			}
		}
		if (!publicKeyData) {
			throw new Error('Unable to load public key');
		}
		const privateKeyData = await crypto.subtle.importKey('pkcs8', bufferFromPem(privateKey), algorithmInfo, true, ['decrypt']);
		return {
			public: publicKeyData,
			private: privateKeyData,
			publicString: publicKey,
			privateString: privateKey,
			keySizeBits,
		};
	},

	encrypt: async (plaintextUtf8: string, rsaKeyPair: RSAKeyPair): Promise<string> => {
		// TODO: Support long-data encryption in a way compatible with node-rsa.
		return Buffer.from(
			await crypto.subtle.encrypt({ name: algorithmName }, rsaKeyPair.public, Buffer.from(plaintextUtf8, 'utf8'))
		).toString('base64');
	},

	decrypt: async (ciphertextBase64: string, rsaKeyPair: RSAKeyPair): Promise<string> => {
		return await ecbDecrypt(ciphertextBase64, async ({ ciphertextBlockBuffer }) => {
			return Buffer.from(
				await crypto.subtle.decrypt({ name: algorithmName }, rsaKeyPair.private, ciphertextBlockBuffer)
			).toString('utf-8');
		}, rsaKeyPair.keySizeBits);
	},

	publicKey: (rsaKeyPair: RSAKeyPair): string => {
		return rsaKeyPair.publicString;
	},

	privateKey: (rsaKeyPair: RSAKeyPair): string => {
		return rsaKeyPair.privateString;
	},

};

export default rsa;
