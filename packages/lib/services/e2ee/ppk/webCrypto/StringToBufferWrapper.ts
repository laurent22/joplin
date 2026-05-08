import { PublicKeyCrypto } from '../../types';


const isLowercaseHexadecimalString = (text: string) => {
	return text.match(/^[a-f0-9]+$/) && text.length % 2 === 0;
};

export default class StringToBufferDecorator<KeyPair> implements PublicKeyCrypto<KeyPair> {
	public constructor(private publicKeyCrypto_: PublicKeyCrypto<KeyPair, Buffer<ArrayBuffer>>) {}

	public async generateKeyPair() {
		return this.publicKeyCrypto_.generateKeyPair();
	}

	public async loadKeys(publicKeySource: string, privateKeySource: string, keySizeBits: number) {
		return this.publicKeyCrypto_.loadKeys(publicKeySource, privateKeySource, keySizeBits);
	}

	private textToBuffer_(textUtf8: string) {
		// To avoid data loss when restoring (whether everything is capital or lowercase), work only
		// with lowercase hexadecimal.
		const isHex = isLowercaseHexadecimalString(textUtf8);

		// RSA can only encrypt a limited amount of data. If given hexadecimal data (e.g. when given
		// a Joplin master key), try to encrypt in that format.
		let data = isHex ? Buffer.from(textUtf8, 'hex') : Buffer.from(textUtf8, 'utf8');

		// Store the original data format with a single-byte suffix.
		if (isHex) {
			data = Buffer.concat([data, new Uint8Array([1])]);
		} else {
			data = Buffer.concat([data, new Uint8Array([0])]);
		}

		return data;
	}

	private bufferToText_(buffer: Buffer) {
		let encoding: BufferEncoding;
		const isHex = buffer.byteLength > 0 && buffer.readUInt8(buffer.byteLength - 1) === 1;
		if (isHex) {
			encoding = 'hex';
		} else {
			encoding = 'utf8';
		}

		// Use .slice for mobile compatibility:
		buffer = buffer.slice(0, buffer.byteLength - 1);
		return Buffer.from(buffer).toString(encoding);
	}

	public get maximumPlaintextLengthBytes() {
		const baseMaximumLength = this.publicKeyCrypto_.maximumPlaintextLengthBytes;
		if (!baseMaximumLength) return baseMaximumLength;

		// Subtract an additional -1 to account for metadata:
		return baseMaximumLength - 1;
	}

	public async encrypt(plaintextUtf8: string, rsaKeyPair: KeyPair) {
		const plaintextBuffer = this.textToBuffer_(plaintextUtf8);
		const internalMaximumLength = this.publicKeyCrypto_.maximumPlaintextLengthBytes;
		if (plaintextBuffer.byteLength > internalMaximumLength) {
			throw new Error(`Data too long (longer than ${internalMaximumLength})`);
		}

		const ciphertext = await this.publicKeyCrypto_.encrypt(plaintextBuffer, rsaKeyPair);
		return Buffer.from(ciphertext);
	}

	public async decrypt(ciphertext: Buffer<ArrayBuffer>, rsaKeyPair: KeyPair) {
		const plaintextBuffer = await this.publicKeyCrypto_.decrypt(ciphertext, rsaKeyPair);
		return this.bufferToText_(plaintextBuffer);
	}

	public async publicKey(rsaKeyPair: KeyPair) {
		return this.publicKeyCrypto_.publicKey(rsaKeyPair);
	}

	public async privateKey(rsaKeyPair: KeyPair) {
		return this.publicKeyCrypto_.privateKey(rsaKeyPair);
	}
}
