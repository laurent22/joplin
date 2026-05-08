import { CiphertextBuffer, PublicKeyCrypto } from '../../types';

// The web crypto API is available in both NodeJS and browsers
export type WebCryptoSlice = {
	subtle: Pick<
	SubtleCrypto,
		// Restrict to methods that are known to be supported on mobile:
		'generateKey'|'importKey'|'encrypt'|'decrypt'|'exportKey'
	>;
};

interface KeyPair {
	publicKey: CryptoKey;
	privateKey: CryptoKey|null;
}

interface RsaCryptoConfig {
	modulusLengthBits: number;
}

export default class WebCryptoRsa implements PublicKeyCrypto<KeyPair, Buffer<ArrayBuffer>> {
	public constructor(private webCrypto_: WebCryptoSlice, private config_: RsaCryptoConfig) {}

	public async generateKeyPair() {
		// See the RSA dom example:
		// https://github.com/mdn/dom-examples/blob/8c3d2a9781204e60b52371e300aebf067cd0b876/web-crypto/encrypt-decrypt/rsa-oaep.js#L71
		// and the relevant MDN documentation:
		// https://developer.mozilla.org/en-US/docs/Web/API/RsaHashedKeyGenParams
		const keyPair = await this.webCrypto_.subtle.generateKey({
			name: 'RSA-OAEP',
			modulusLength: this.config_.modulusLengthBits,
			// From https://developer.mozilla.org/en-US/docs/Web/API/RsaHashedKeyGenParams#publicexponent
			// "Unless you have a good reason to use something else, specify 65537 here ([0x01, 0x00, 0x01])."
			publicExponent: new Uint8Array([1, 0, 1]),
			hash: 'SHA-256',
		}, true, ['encrypt', 'decrypt']);

		return {
			keyPair,
			keySize: this.config_.modulusLengthBits,
		};
	}

	public async loadKeys(publicKeySource: string, privateKeySource: string): Promise<KeyPair> {
		const importKey = (keySource: string, usages: KeyUsage[]) => {
			return this.webCrypto_.subtle.importKey(
				'jwk', JSON.parse(keySource), { name: 'RSA-OAEP', hash: 'SHA-256' }, true, usages,
			);
		};
		const publicKey = await importKey(publicKeySource, ['encrypt']);
		const privateKey = privateKeySource ? await importKey(privateKeySource, ['decrypt']) : null;
		return {
			publicKey,
			privateKey,
		};
	}

	public get maximumPlaintextLengthBytes() {
		// See https://www.rfc-editor.org/rfc/rfc8017#section-7.1.1,
		// and https://crypto.stackexchange.com/a/42100
		const modulusLengthBytes = Math.ceil(this.config_.modulusLengthBits / 8);
		const hashLengthBytes = 256 / 8;
		const maximumMessageSize = modulusLengthBytes - 2 * hashLengthBytes - 2;
		return maximumMessageSize;
	}

	public async encrypt(plaintextBuffer: Buffer<ArrayBuffer>, rsaKeyPair: KeyPair) {
		if (!rsaKeyPair.publicKey) {
			throw new Error('Missing public key');
		}

		if (plaintextBuffer.byteLength > this.maximumPlaintextLengthBytes) {
			// Fail early -- the error provided by webCrypto when the data is too long is often
			// difficult to understand.
			throw new Error('Data too long');
		}

		const ciphertext = await this.webCrypto_.subtle.encrypt(
			{ name: 'RSA-OAEP' }, rsaKeyPair.publicKey, plaintextBuffer,
		);
		return Buffer.from(ciphertext);
	}

	public async decrypt(ciphertext: CiphertextBuffer, rsaKeyPair: KeyPair) {
		if (!rsaKeyPair.privateKey) {
			throw new Error('Missing private key');
		}

		const plaintextBuffer = Buffer.from(await this.webCrypto_.subtle.decrypt(
			{ name: 'RSA-OAEP' }, rsaKeyPair.privateKey, ciphertext,
		));
		return plaintextBuffer;
	}

	private async exportKey_(key: CryptoKey) {
		const exported = { ...await this.webCrypto_.subtle.exportKey('jwk', key) };

		// Remove padding -- When running in React Native, JWK base64URL fields are padded with "."s.
		// Chromium fails to import such keys, with a comment that the "JSON web signature spec says that padding is omitted."
		// See https://github.com/chromium/chromium/blob/dd96966cf845460bad4bc352625b9188e98ae501/components/webcrypto/jwk.cc#L309
		const base64Members = ['n', 'e', 'qi', 'dp', 'dq', 'q', 'p', 'd'];
		const result = Object.create(null);
		for (const [key, value] of Object.entries(exported)) {
			if (base64Members.includes(key) && typeof value === 'string') {
				// react-native-quick-crypto uses "."s for padding:
				result[key] = value.replace(/\.+$/, '');
			} else {
				result[key] = value;
			}
		}

		return JSON.stringify(result);
	}

	public async publicKey(rsaKeyPair: KeyPair) {
		return this.exportKey_(rsaKeyPair.publicKey);
	}

	public async privateKey(rsaKeyPair: KeyPair) {
		if (!rsaKeyPair.privateKey) {
			throw new Error('Missing private key');
		}

		return this.exportKey_(rsaKeyPair.privateKey);
	}
}
