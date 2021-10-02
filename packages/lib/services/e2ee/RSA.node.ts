import { RSA, RSAKeyPair } from './types';
import * as NodeRSA from 'node-rsa';

const nodeRSAOptions: NodeRSA.Options = {
	encryptionScheme: 'pkcs1_oaep',
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
		keys.importKey(publicKey, 'pkcs1-public-pem');
		if (privateKey) keys.importKey(privateKey, 'pkcs1-private-pem');
		return keys;
	},

	encrypt: async (plaintextBase64: string, rsaKeyPair: RSAKeyPair): Promise<string> => {
		return rsaKeyPair.encrypt(plaintextBase64, 'base64', 'base64');
	},

	decrypt: async (ciphertextBase64: string, rsaKeyPair: RSAKeyPair): Promise<string> => {
		return rsaKeyPair.decrypt(ciphertextBase64, 'base64');
	},

	publicKey: (rsaKeyPair: RSAKeyPair): string => {
		return rsaKeyPair.exportKey('pkcs1-public-pem');
	},

	privateKey: (rsaKeyPair: RSAKeyPair): string => {
		return rsaKeyPair.exportKey('pkcs1-private-pem');
	},

};

export default rsa;
