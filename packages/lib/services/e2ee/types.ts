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

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export type RSAKeyPair = any; // Depends on implementation

// This is the interface that each platform must implement. Data is passed as
// Base64 encoded because that's what both NodeRSA and react-native-rsa support.

export interface RSA {
	generateKeyPair(keySize: number): Promise<RSAKeyPair>;
	loadKeys(publicKey: string, privateKey: string, keySizeBits: number): Promise<RSAKeyPair>;
	encrypt(plaintextUtf8: string, rsaKeyPair: RSAKeyPair): Promise<string>; // Returns Base64 encoded data
	decrypt(ciphertextBase64: string, rsaKeyPair: RSAKeyPair): Promise<string>; // Returns UTF-8 encoded string
	publicKey(rsaKeyPair: RSAKeyPair): string;
	privateKey(rsaKeyPair: RSAKeyPair): string;
}

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
