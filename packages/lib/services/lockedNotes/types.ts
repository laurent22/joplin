
import type { EncryptionResult } from '../e2ee/types';

export type LockedNotesAlgorithmId = 1;

export interface LockedNotesHeaderV1 {
	version: 1;
	algorithm: LockedNotesAlgorithmId;
	masterKeyId: string; // 32 hex chars (lowercase)
	iterationCount: number;
	saltLength: number; // bytes
	authTagLength: number; // bytes
	flags: number; // reserved (0 for now)
}

export type LockedNotesChunk = EncryptionResult;

export interface LockedNotesEncryptOptions {
	masterKeyId: string;
	/**
	 * Decrypted master key material (password) used with PBKDF2.
	 * (Wire-up to the actual master key retrieval happens later.)
	 */
	encryptionKey: string;

	iterationCount?: number;
	saltLength?: number;
	authTagLength?: number;
	fileChunkSize?: number;
}

export interface LockedNotesDecryptOptions {
	encryptionKey: string;
}


export interface AsyncChunkReader {

	read(maxBytes: number): Promise<Buffer | null>;
}

export interface AsyncChunkWriter {
	write(data: Buffer): Promise<void>;
}
