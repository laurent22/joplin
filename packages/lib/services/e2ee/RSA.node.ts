import { RSA, RSAKeyPair } from './types';
import * as NodeRSA from 'node-rsa';

const nodeRSAOptions: NodeRSA.Options = {
	// Must use pkcs1 otherwise any data encrypted with NodeRSA will crash the
	// app when decrypted by RN-RSA.
	// https://github.com/amitaymolko/react-native-rsa-native/issues/66#issuecomment-932768139
	encryptionScheme: 'pkcs1',
};

const rsa: RSA = {

	generateKeyPair: async (keySize: number): Promise<RSAKeyPair> => {
		const keys = new NodeRSA();
		keys.setOptions(nodeRSAOptions);
		keys.generateKeyPair(keySize, 65537);

		// Sanity check
		if (!keys.isPrivate()) throw new Error('No private key was generated');
		if (!keys.isPublic()) throw new Error('No public key was generated');

		return keys;
	},

	loadKeys: async (publicKey: string, privateKey: string): Promise<RSAKeyPair> => {
		const keys = new NodeRSA();
		keys.setOptions(nodeRSAOptions);
		// Don't specify the import format, and let it auto-detect because
		// react-native-rsa might not create a key in the expected format.
		keys.importKey(publicKey);
		if (privateKey) keys.importKey(privateKey);
		return keys;
	},

	encrypt: async (plaintextUtf8: string, rsaKeyPair: RSAKeyPair): Promise<string> => {
		return rsaKeyPair.encrypt(plaintextUtf8, 'base64', 'utf8');
	},

	decrypt: async (ciphertextBase64: string, rsaKeyPair: RSAKeyPair): Promise<string> => {
		return rsaKeyPair.decrypt(ciphertextBase64, 'utf8');
	},

	publicKey: (rsaKeyPair: RSAKeyPair): string => {
		return rsaKeyPair.exportKey('pkcs1-public-pem');
	},

	privateKey: (rsaKeyPair: RSAKeyPair): string => {
		return rsaKeyPair.exportKey('pkcs1-private-pem');
	},

};

export default rsa;
