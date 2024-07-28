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
	// low level functions
	getCiphers(): string[];
	getHashes(): string[];
	randomBytes(size: number): Promise<CryptoBuffer>;
	pbkdf2Raw(password: string, salt: CryptoBuffer, iterations: number, keylen: number, digest: Digest): Promise<CryptoBuffer>;
	encryptRaw(data: CryptoBuffer, algorithm: string, key: CryptoBuffer, iv: CryptoBuffer | null, authTagLength: number, associatedData: CryptoBuffer | null): Buffer;
	decryptRaw(data: CryptoBuffer, algorithm: string, key: CryptoBuffer, iv: CryptoBuffer, authTagLength: number, associatedData: CryptoBuffer | null): Buffer;

	// convenient functions
	encrypt(password: string, iterationCount: number, salt: CryptoBuffer | null, data: CryptoBuffer): Promise<EncryptionResult>;
	decrypt(password: string, data: EncryptionResult): Promise<Buffer>;
	encryptString(password: string, iterationCount: number, salt: CryptoBuffer | null, data: string, encoding: BufferEncoding): Promise<EncryptionResult>;
}

export interface CryptoBuffer extends Uint8Array {
	toString(encoding?: BufferEncoding, start?: number, end?: number): string;
}

// From react-native-quick-crypto.HashAlgorithm, but use the hash name style in node:crypto
export enum Digest {
	sha1 = 'sha1',
	sha224 = 'sha224',
	sha256 = 'sha256',
	sha384 = 'sha384',
	sha512 = 'sha512',
	ripemd160 = 'ripemd160',
}

export enum CipherAlgorithm {
	AES_128_CCM = 'aes-128-ccm',
	AES_192_CCM = 'aes-192-ccm',
	AES_256_CCM = 'aes-256-ccm',
	AES_128_GCM = 'aes-128-gcm',
	AES_192_GCM = 'aes-192-gcm',
	AES_256_GCM = 'aes-256-gcm',
}

export interface EncryptionResult {
	algo?: CipherAlgorithm; // cipher algorithm, default: aes-256-gcm
	ts?: number; // authTagLength in bytes, default: 16
	digest?: Digest; // digestAlgorithm, default: sha512
	iter: number; // iteration count
	salt: string; // base64 encoded
	iv: string; // base64 encoded
	ct: string; // cipherText, base64 encoded
}
