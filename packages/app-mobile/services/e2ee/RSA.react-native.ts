import { RSA } from '@joplin/lib/services/e2ee/types';
const RnRSA = require('react-native-rsa-native').RSA;

interface RSAKeyPair {
	public: string;
	private: string;
}

const rsa: RSA = {

	generateKeyPair: async (keySize: number): Promise<RSAKeyPair> => {
		const keys: RSAKeyPair = await RnRSA.generateKeys(keySize);

		// Sanity check
		if (!keys.private) throw new Error('No private key was generated');
		if (!keys.public) throw new Error('No public key was generated');

		return keys;
	},

	loadKeys: async (publicKey: string, privateKey: string): Promise<RSAKeyPair> => {
		return { public: publicKey, private: privateKey };
	},

	encrypt: async (plaintextUtf8: string, rsaKeyPair: RSAKeyPair): Promise<string> => {
		return RnRSA.encrypt(plaintextUtf8, rsaKeyPair.public);
	},

	decrypt: async (ciphertextBase64: string, rsaKeyPair: RSAKeyPair): Promise<string> => {
		return RnRSA.decrypt(ciphertextBase64, rsaKeyPair.private);
	},

	publicKey: (rsaKeyPair: RSAKeyPair): string => {
		return rsaKeyPair.public;
	},

	privateKey: (rsaKeyPair: RSAKeyPair): string => {
		return rsaKeyPair.private;
	},

};

export default rsa;
