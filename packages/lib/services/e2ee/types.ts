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
	getCiphers(): string[];
	getHashes(): string[];
	randomBytes(size: number): Promise<CryptoBuffer>;
	pbkdf2Raw(password: string, salt: CryptoBuffer, iterations: number, keylen: number, digest: HashAlgorithm): Promise<CryptoBuffer>;
}

export interface CryptoBuffer extends Uint8Array {
	toString(encoding?: BufferEncoding, start?: number, end?: number): string;
}

// From react-native-quick-crypto
export type HashAlgorithm =
  | 'SHA-1'
  | 'SHA-224'
  | 'SHA-256'
  | 'SHA-384'
  | 'SHA-512'
  | 'RIPEMD-160';
