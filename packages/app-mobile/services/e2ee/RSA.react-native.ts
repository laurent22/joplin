import { RSA } from '@joplin/lib/services/e2ee/types';
import ecbDecrypt from './ecbDecrypt';
const RnRSA = require('react-native-rsa-native').RSA;

interface RSAKeyPair {
	public: string;
	private: string;
	keySizeBits: number;
}

const rsa: RSA = {

	generateKeyPair: async (keySize: number): Promise<RSAKeyPair> => {
		const keys: RSAKeyPair = await RnRSA.generateKeys(keySize);

		// Sanity check
		if (!keys.private) throw new Error('No private key was generated');
		if (!keys.public) throw new Error('No public key was generated');

		return rsa.loadKeys(keys.public, keys.private, keySize);
	},

	loadKeys: async (publicKey: string, privateKey: string, keySizeBits: number): Promise<RSAKeyPair> => {
		return { public: publicKey, private: privateKey, keySizeBits };
	},

	encrypt: async (plaintextUtf8: string, rsaKeyPair: RSAKeyPair): Promise<string> => {
		// TODO: Support long-data encryption in a way compatible with node-rsa.
		return RnRSA.encrypt(plaintextUtf8, rsaKeyPair.public);
	},

	decrypt: async (ciphertextBase64: string, rsaKeyPair: RSAKeyPair): Promise<string> => {
		return await ecbDecrypt(ciphertextBase64, async ({ ciphertextBlockBase64 }) => {
			return await RnRSA.decrypt(ciphertextBlockBase64, rsaKeyPair.private);
		}, rsaKeyPair.keySizeBits);
	},

	publicKey: (rsaKeyPair: RSAKeyPair): string => {
		return rsaKeyPair.public;
	},

	privateKey: (rsaKeyPair: RSAKeyPair): string => {
		return rsaKeyPair.private;
	},

};

export default rsa;
