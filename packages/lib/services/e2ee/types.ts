export interface MasterKeyEntity {
	id?: string | null;
	created_time?: number;
	updated_time?: number;
	source_application?: string;
	encryption_method?: number;
	checksum?: string;
	content?: string;
	type_?: number;
	enabled?: number;
	hasBeenUsed?: boolean;
}

export type KeyPairAndSize<KeyPair> = { keyPair: KeyPair; keySize: number };

export enum PublicKeyAlgorithm {
	Unknown = 'unknown',
	RsaV1 = 'rsa-v1', // 'rsa-pkcs1-v1.5',
	RsaV2 = 'rsa-v2', // 'rsa-pkcs1-oaep-2048',
	RsaV3 = 'rsa-v3', // 'rsa-pkcs1-oaep-4096',
}

export type CiphertextBuffer = Buffer<ArrayBuffer>;

export interface PublicKeyCrypto<
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Partial refactor of old code before rule was applied
	KeyPair = any, // Depends on implementation
	InputDataType = string, // Usually hexadecimal data
> {
	generateKeyPair(): Promise<KeyPairAndSize<KeyPair>>;
	loadKeys(publicKey: string, privateKey: string, keySizeBits: number): Promise<KeyPair>;
	encrypt(plaintextUtf8: InputDataType, rsaKeyPair: KeyPair): Promise<CiphertextBuffer>;
	decrypt(ciphertext: CiphertextBuffer, rsaKeyPair: KeyPair): Promise<InputDataType>;
	publicKey(rsaKeyPair: KeyPair): Promise<string>;
	privateKey(rsaKeyPair: KeyPair): Promise<string>;
	// Maximum input size, output size may be greater. Use "null" to specify an arbitrary size.
	maximumPlaintextLengthBytes: number|null;
}

// This is the interface that each platform must implement. Data is passed as
// Base64 encoded because that's what both NodeRSA and react-native-rsa support.

export type PublicKeyCryptoProvider = Record<PublicKeyAlgorithm, PublicKeyCrypto>;

export interface Crypto {
	randomBytes(size: number): Promise<CryptoBuffer>;
	digest(algorithm: Digest, data: Uint8Array): Promise<CryptoBuffer>;
	generateNonce(nonce: Uint8Array): Promise<Uint8Array>;
	increaseNonce(nonce: Uint8Array): Promise<Uint8Array>;
	encrypt(password: string, salt: CryptoBuffer, data: CryptoBuffer, options: EncryptionParameters): Promise<EncryptionResult>;
	decrypt(password: string, data: EncryptionResult, options: EncryptionParameters): Promise<Buffer>;
	encryptString(password: string, salt: CryptoBuffer, data: string, encoding: BufferEncoding, options: EncryptionParameters): Promise<EncryptionResult>;
}

export interface CryptoBuffer extends Uint8Array {
	toString(encoding?: BufferEncoding, start?: number, end?: number): string;
}

// A subset of react-native-quick-crypto.HashAlgorithm, supported by Web Crypto API
export enum Digest {
	sha1 = 'SHA-1',
	sha256 = 'SHA-256',
	sha384 = 'SHA-384',
	sha512 = 'SHA-512',
}

export enum CipherAlgorithm {
	AES_128_GCM = 'aes-128-gcm',
	AES_192_GCM = 'aes-192-gcm',
	AES_256_GCM = 'aes-256-gcm',
}

export interface EncryptionResult {
	salt: string; // base64 encoded
	iv: string; // base64 encoded
	ct: string; // cipherText, base64 encoded
}

export interface EncryptionParameters {
	cipherAlgorithm: CipherAlgorithm;
	authTagLength: number; // in bytes
	digestAlgorithm: Digest;
	keyLength: number; // in bytes
	associatedData: Uint8Array;
	iterationCount: number;
}
