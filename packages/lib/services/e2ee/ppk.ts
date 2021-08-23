import * as NodeRSA from 'node-rsa';

export interface PublicPrivateKeyPair {
	publicKey: string;
	privateKey: string;
}

export function generateKeyPair(): PublicPrivateKeyPair {
	const keys = new NodeRSA();
	keys.generateKeyPair(2048, 65537);

	// Sanity check
	if (!keys.isPrivate()) throw new Error('No private key was generated');
	if (!keys.isPublic()) throw new Error('No public key was generated');

	return {
		privateKey: keys.exportKey('pkcs1-private-pem'),
		publicKey: keys.exportKey('pkcs1-public-pem'),
	};
}
