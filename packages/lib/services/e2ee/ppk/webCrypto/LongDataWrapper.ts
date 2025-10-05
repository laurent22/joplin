import { CiphertextBuffer, PublicKeyCrypto } from '../../types';

// This implementation is intended to roughly match what's used by NodeRSA
// for long input data (https://github.com/rzcoder/node-rsa/blob/e7e7f7d2942a3bac1d2e132a881e5a3aceda10a1/src/libs/rsa.js#L252).
// However, this approach ("Electronic Code Block mode") is known to be insecure
// in certain situations (e.g. if an attacker controls a prefix of the plaintext
// and can inspect the ciphertext or for certain plaintexts). The two previously-listed
// cases *shouldn't* affect Joplin master key encryption (pseudorandom data with
// a length slightly bigger than the block size). However, it would be best to
// avoid using "LongDataWrapper" if an alternative is available.
export default class LongDataWrapper<KeyPair> implements PublicKeyCrypto<KeyPair, Buffer<ArrayBuffer>> {
	public constructor(
		private publicKeyCrypto_: PublicKeyCrypto<KeyPair, Buffer<ArrayBuffer>>,
		// For RSA, this is usually the key size
		private ciphertextBlockSizeBytes_: number,
	) {}

	public async generateKeyPair() {
		return this.publicKeyCrypto_.generateKeyPair();
	}

	public async loadKeys(publicKeySource: string, privateKeySource: string, keySizeBits: number) {
		return this.publicKeyCrypto_.loadKeys(publicKeySource, privateKeySource, keySizeBits);
	}

	public get maximumPlaintextLengthBytes() {
		// For security, input data should not be much longer than the wrapped
		// implementation's maximum length.
		return this.publicKeyCrypto_.maximumPlaintextLengthBytes * 2;
	}

	public async encrypt(plaintext: Buffer<ArrayBuffer>, rsaKeyPair: KeyPair) {
		if (plaintext.length > this.maximumPlaintextLengthBytes) {
			throw new Error(`Input data too long (maximum length: ${this.maximumPlaintextLengthBytes})`);
		}

		const chunks = [];

		const internalMaximumLength = this.publicKeyCrypto_.maximumPlaintextLengthBytes;
		for (let offset = 0; offset < plaintext.length; offset += internalMaximumLength) {
			const subarray = plaintext.subarray(offset, offset + internalMaximumLength);
			const chunk = await this.publicKeyCrypto_.encrypt(subarray, rsaKeyPair);

			if (chunk.byteLength !== this.ciphertextBlockSizeBytes_) {
				throw new Error(`Assertion failed: ciphertextBlockSize_ (${this.ciphertextBlockSizeBytes_}) does not match the actual block size.`);
			}

			chunks.push(chunk);
		}
		return Buffer.concat(chunks);
	}

	public async decrypt(ciphertext: CiphertextBuffer, rsaKeyPair: KeyPair) {
		if (ciphertext.byteLength % this.ciphertextBlockSizeBytes_ !== 0) {
			throw new Error(`The ciphertext length (${ciphertext.byteLength}) must be a multiple of the block size (${this.ciphertextBlockSizeBytes_})`);
		}

		const chunks = [];
		for (let offset = 0; offset < ciphertext.length; offset += this.ciphertextBlockSizeBytes_) {
			const subarray = ciphertext.subarray(offset, offset + this.ciphertextBlockSizeBytes_);
			chunks.push(await this.publicKeyCrypto_.decrypt(subarray, rsaKeyPair));
		}
		return Buffer.concat(chunks);
	}

	public async publicKey(rsaKeyPair: KeyPair) {
		return this.publicKeyCrypto_.publicKey(rsaKeyPair);
	}

	public async privateKey(rsaKeyPair: KeyPair) {
		return this.publicKeyCrypto_.privateKey(rsaKeyPair);
	}
}
