export const encryptedProfileMetadataFileName = 'profile-encryption.json';
export const encryptedProfilePlaintextBackupFileName = 'database.sqlite.before-encryption-backup';
export const encryptedProfileMetadataVersion = 1;
export const encryptedProfileMinPasswordLength = 8;
export const encryptedProfileMaxFailedAttemptsBeforeCooldown = 5;
export const encryptedProfileCooldownMs = 30 * 1000;

export type EncryptedProfileMigrationState = 'none' | 'pending' | 'complete' | 'failed';

export interface EncryptedProfileKdfParams {
	algorithm: 'scrypt';
	salt: string;
	keyLength: number;
	cost: number;
	blockSize: number;
	parallelization: number;
}

export interface EncryptedProfileWrappedDatabaseKey {
	algorithm: 'aes-256-gcm';
	iv: string;
	authTag: string;
	ciphertext: string;
}

export interface EncryptedProfileCipherParams {
	provider: 'sqlcipher';
	version: 4;
}

export interface EncryptedProfileMetadata {
	version: number;
	enabled: boolean;
	kdf: EncryptedProfileKdfParams;
	wrappedDatabaseKey: EncryptedProfileWrappedDatabaseKey;
	cipher: EncryptedProfileCipherParams;
	migrationState: EncryptedProfileMigrationState;
	createdAt: string;
	updatedAt: string;
}

export interface EncryptedProfileRuntimeState {
	failedAttempts: number;
	cooldownUntil: number;
	unlocked: boolean;
}

export interface EncryptedProfileUnlockResult {
	success: boolean;
	databaseKeyHex?: string;
}
