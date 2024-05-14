import { RSA } from '@joplin/lib/services/e2ee/types';
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
		const ciphertextBuffer = Buffer.from(ciphertextBase64, 'base64');
		const maximumEncryptedSize = Math.floor(rsaKeyPair.keySizeBits / 8); // Usually 256

		// On iOS, .decrypt fails without throwing or rejecting.
		// This function throws for consistency with Android.
		const handleError = (plainText: string|undefined) => {
			if (plainText === undefined) {
				throw new Error(`
					RN RSA: Decryption failed.
						cipherTextLength=${ciphertextBuffer.length},
						maxEncryptedSize=${maximumEncryptedSize}
				`.trim());
			}
		};

		// Master keys are encrypted with RSA and are longer than the default modulus size of 256 bytes.
		// node-rsa supports encrypting larger amounts of data using RSA.
		// See their implementation for details: https://github.com/rzcoder/node-rsa/blob/e7e7f7d2942a3bac1d2e132a881e5a3aceda10a1/src/libs/rsa.js#L252
		if (ciphertextBuffer.length > maximumEncryptedSize) {
			// Use a numBlocks and blockSize that match node-rsa:
			const numBlocks = Math.ceil(ciphertextBuffer.length / maximumEncryptedSize);
			const blockSize = maximumEncryptedSize;

			const result: string[] = [];
			for (let i = 0; i < numBlocks; i++) {
				const ciphertextBlock = ciphertextBuffer.slice(
					i * blockSize, Math.min(ciphertextBuffer.length, (i + 1) * blockSize),
				);
				const plainText = await RnRSA.decrypt(ciphertextBlock.toString('base64'), rsaKeyPair.private);

				handleError(plainText);
				result.push(plainText);
			}
			return result.join('');
		} else {
			const plainText = await RnRSA.decrypt(ciphertextBase64, rsaKeyPair.private);
			handleError(plainText);
			return plainText;
		}
	},

	publicKey: (rsaKeyPair: RSAKeyPair): string => {
		return rsaKeyPair.public;
	},

	privateKey: (rsaKeyPair: RSAKeyPair): string => {
		return rsaKeyPair.private;
	},

};

export default rsa;
