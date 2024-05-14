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
		// TODO: Support long-data encryption.
		return RnRSA.encrypt(plaintextUtf8, rsaKeyPair.public);
	},

	decrypt: async (ciphertextBase64: string, rsaKeyPair: RSAKeyPair): Promise<string> => {
		// Multiply by 6/8: Each character corresponds to 6 bits, but there are 8 bits in a byte.
		// Remove =s: Each = means "discard two bits" for up to 4 bits.
		// Note: It's okay for this to be a slight overestimate.
		// See also https://en.wikipedia.org/wiki/Base64
		const ciphertextLength = Math.floor(ciphertextBase64.replace(/=/g, '').length * 6 / 8);

		const maximumEncryptedSize = Math.floor(rsaKeyPair.keySizeBits / 8); // Usually 256
		if (ciphertextLength > maximumEncryptedSize) {
			const ciphertextBuffer = Buffer.from(ciphertextBase64, 'base64');
			// Use a numBlocks and blockSize that match node-rsa:
			const numBlocks = Math.ceil(ciphertextBuffer.length / maximumEncryptedSize);
			const blockSize = maximumEncryptedSize;

			const result: string[] = [];
			for (let i = 0; i < numBlocks; i++) {
				const ciphertextBlock = ciphertextBuffer.slice(
					i * blockSize, Math.min(ciphertextBuffer.length, (i + 1) * blockSize),
				);
				const plainText = await RnRSA.decrypt(ciphertextBlock.toString('base64'), rsaKeyPair.private);

				// On iOS, .decrypt fails without throwing or rejecting.
				if (plainText === undefined) {
					throw new Error(`
						RN RSA: Decryption failed.
							pt=${plainText}
							i=${i}
							cipherTextLength=${ciphertextLength},${ciphertextBuffer.length},
							blockLength=${ciphertextBlock.length}
							numBlocks=${numBlocks},
							blockSize=${blockSize},
							maxEncryptedSize=${maximumEncryptedSize}
					`.trim());
				}

				result.push(plainText);
			}
			return result.join('');
		} else {
			return RnRSA.decrypt(ciphertextBase64, rsaKeyPair.private);
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
