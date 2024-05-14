import { RSA } from '@joplin/lib/services/e2ee/types';
const RnRSA = require('react-native-rsa-native').RSA;

interface RSAKeyPair {
	public: string;
	private: string;
	keySizeBytes: number;
}

const rsa: RSA = {

	generateKeyPair: async (keySize: number): Promise<RSAKeyPair> => {
		const keys: RSAKeyPair = await RnRSA.generateKeys(keySize);

		// Sanity check
		if (!keys.private) throw new Error('No private key was generated');
		if (!keys.public) throw new Error('No public key was generated');

		return rsa.loadKeys(keys.public, keys.private);
	},

	loadKeys: async (publicKey: string, privateKey: string): Promise<RSAKeyPair> => {
		const publicKeyContent = publicKey
			// Remove header & footer
			.replace(/(^|\n)----.*----(\n|$)/g, '')
			.replace(/\n/g, '');
		// RSA keys are formatted using ASN.1/DER.
		// See https://www.rfc-editor.org/rfc/rfc3447.html#page-44,
		//     https://crypto.stackexchange.com/a/18033, and
		//     https://en.wikipedia.org/wiki/ASN.1
		const publicKeyBytes = Buffer.from(publicKeyContent, 'base64');

		// Note: Broken for mobile keys. Mobile keys use a different format:
		//   0:d=0  hl=4 l= 290 cons: SEQUENCE
		//   4:d=1  hl=2 l=  13 cons: SEQUENCE
		//   6:d=2  hl=2 l=   9 prim: OBJECT            :rsaEncryption
		//   17:d=2  hl=2 l=   0 prim: NULL
		//   19:d=1  hl=4 l= 271 prim: BIT STRING
		// (from cat pubKeyData | openssl asn1parse -inform PEM)

		let cursor = 0;
		const readTag = (expected: number) => {
			// The last 5 bits give the tag type.
			const tagValue = publicKeyBytes.readUInt8(cursor) & 0x1F;
			cursor++;
			if (tagValue !== expected) {
				throw new Error(`Unexpected tag value at index ${cursor}. Was ${tagValue}, expected ${expected}`);
			}
			return tagValue;
		};
		const readLength = () => {
			const lengthSpecifier = publicKeyBytes.readUInt8(cursor);
			cursor++;

			const longFormBit = !!(0x80 & lengthSpecifier);
			let length;
			if (longFormBit) {
				// The byte length of the length field
				const lengthFieldByteLength = 0x7F & lengthSpecifier;

				if (lengthFieldByteLength === 1) {
					length = publicKeyBytes.readUInt8(cursor);
				} else if (lengthFieldByteLength === 2) {
					length = publicKeyBytes.readUInt16BE(cursor);
				} else if (lengthFieldByteLength === 3) {
					length = publicKeyBytes.readUInt32BE(cursor);
				} else {
					throw new Error(`Unsupported length field size, ${lengthFieldByteLength}`);
				}
				cursor += lengthFieldByteLength;
			} else {
				length = lengthSpecifier;
			}

			return length;
		};

		readTag(16); // Sequence tag

		// Length of the full key (including exponent).
		readLength();

		// Use a heuristic to determine the byte length used to generate the key.
		// react-native-rsa-native only supports two key sizes: 256 and 512
		// const byteLength = publicKeyContent.length < 400 ? 256 : 512;
		readTag(2); // Integer tag

		const length = readLength();

		return { public: publicKey, private: privateKey, keySizeBytes: length };
	},

	encrypt: async (plaintextUtf8: string, rsaKeyPair: RSAKeyPair): Promise<string> => {
		return RnRSA.encrypt(plaintextUtf8, rsaKeyPair.public);
	},

	decrypt: async (ciphertextBase64: string, rsaKeyPair: RSAKeyPair): Promise<string> => {
		// Multiply by 6/8: Each character corresponds to 6 bits, but there are 8 bits in a byte.
		// Remove =s: Each = means "discard two bits" for up to 4 bits.
		// See also https://en.wikipedia.org/wiki/Base64
		const ciphertextLength = Math.floor(ciphertextBase64.replace(/=/g, '').length * 6 / 8);

		const maximumEncryptedSize = rsaKeyPair.keySizeBytes; // Usually 256
		if (ciphertextLength > maximumEncryptedSize) {
			const ciphertextBuffer = Buffer.from(ciphertextBase64, 'base64');
			// Use a numBlocks and blockSize that match node-rsa:
			const numBlocks = Math.ceil(ciphertextBuffer.length / maximumEncryptedSize);
			const blockSize = ciphertextBuffer.length / numBlocks;

			const result: string[] = [];
			for (let i = 0; i < numBlocks; i++) {
				const cyphertextBlock = ciphertextBuffer.slice(
					i * blockSize, Math.min(ciphertextBuffer.length, (i + 1) * blockSize),
				);
				const plainText = await RnRSA.decrypt(cyphertextBlock.toString('base64'), rsaKeyPair.private);

				// On iOS, .decrypt fails without throwing or rejecting.
				if (plainText === undefined) {
					throw new Error('RN RSA: Decryption failed.');
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
