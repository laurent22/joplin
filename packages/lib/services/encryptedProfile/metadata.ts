import { createCipheriv, createDecipheriv, randomBytes, scrypt as scryptCallback, ScryptOptions, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import {
	encryptedProfileMetadataFileName,
	encryptedProfileMetadataVersion,
	encryptedProfileMinPasswordLength,
	EncryptedProfileMetadata,
	EncryptedProfileMigrationState,
} from './types';
import { _ } from '../../locale';

const scrypt = promisify((
	password: string,
	salt: string,
	keyLength: number,
	options: ScryptOptions,
	callback: (error: Error, derivedKey: Buffer)=> void,
) => {
	scryptCallback(password, salt, keyLength, options, callback);
});

const defaultKdfParams = {
	keyLength: 32,
	cost: 16384,
	blockSize: 8,
	parallelization: 1,
};

export const encryptedProfileMetadataPath = (profileDir: string) => {
	return `${profileDir}/${encryptedProfileMetadataFileName}`;
};

export const isEncryptedProfileMetadata = (value: unknown): value is EncryptedProfileMetadata => {
	if (!value || typeof value !== 'object') return false;
	const item = value as Partial<EncryptedProfileMetadata>;
	return item.version === encryptedProfileMetadataVersion &&
		typeof item.enabled === 'boolean' &&
		!!item.kdf &&
		item.kdf.algorithm === 'scrypt' &&
		typeof item.kdf.salt === 'string' &&
		typeof item.kdf.keyLength === 'number' &&
		typeof item.kdf.cost === 'number' &&
		typeof item.kdf.blockSize === 'number' &&
		typeof item.kdf.parallelization === 'number' &&
		!!item.wrappedDatabaseKey &&
		item.wrappedDatabaseKey.algorithm === 'aes-256-gcm' &&
		typeof item.wrappedDatabaseKey.iv === 'string' &&
		typeof item.wrappedDatabaseKey.authTag === 'string' &&
		typeof item.wrappedDatabaseKey.ciphertext === 'string' &&
		!!item.cipher &&
		item.cipher.provider === 'sqlcipher' &&
		item.cipher.version === 4 &&
		typeof item.migrationState === 'string' &&
		typeof item.createdAt === 'string' &&
		typeof item.updatedAt === 'string';
};

export const readEncryptedProfileMetadata = async (profileDir: string, readFile: (path: string)=> Promise<string>): Promise<EncryptedProfileMetadata | null> => {
	const path = encryptedProfileMetadataPath(profileDir);
	try {
		const content = await readFile(path);
		const parsed = JSON.parse(content);
		if (!isEncryptedProfileMetadata(parsed)) return null;
		return parsed;
	} catch {
		return null;
	}
};

export const writeEncryptedProfileMetadata = async (profileDir: string, metadata: EncryptedProfileMetadata, writeFile: (path: string, content: string)=> Promise<void>) => {
	const path = encryptedProfileMetadataPath(profileDir);
	await writeFile(path, JSON.stringify(metadata, null, '\t'));
};

export const deriveWrappingKey = async (password: string, kdf: EncryptedProfileMetadata['kdf']) => {
	return await scrypt(password, kdf.salt, kdf.keyLength, {
		cost: kdf.cost,
		blockSize: kdf.blockSize,
		parallelization: kdf.parallelization,
	}) as Buffer;
};

export const wrapDatabaseKey = (databaseKey: Buffer, wrappingKey: Buffer) => {
	const iv = randomBytes(12);
	const cipher = createCipheriv('aes-256-gcm', wrappingKey, iv);
	const ciphertext = Buffer.concat([cipher.update(databaseKey), cipher.final()]);
	const authTag = cipher.getAuthTag();
	return {
		algorithm: 'aes-256-gcm' as const,
		iv: iv.toString('base64'),
		authTag: authTag.toString('base64'),
		ciphertext: ciphertext.toString('base64'),
	};
};

export const unwrapDatabaseKey = (wrapped: EncryptedProfileMetadata['wrappedDatabaseKey'], wrappingKey: Buffer) => {
	const decipher = createDecipheriv('aes-256-gcm', wrappingKey, Buffer.from(wrapped.iv, 'base64'));
	decipher.setAuthTag(Buffer.from(wrapped.authTag, 'base64'));
	return Buffer.concat([
		decipher.update(Buffer.from(wrapped.ciphertext, 'base64')),
		decipher.final(),
	]);
};

export const createEncryptedProfileMetadata = async (password: string, migrationState: EncryptedProfileMigrationState = 'none') => {
	if (!password || password.length < encryptedProfileMinPasswordLength) {
		throw new Error(_('Encrypted profile password must be at least %d characters.', encryptedProfileMinPasswordLength));
	}

	const databaseKey = randomBytes(32);
	const salt = randomBytes(16).toString('base64');
	const kdf = {
		algorithm: 'scrypt' as const,
		salt,
		...defaultKdfParams,
	};
	const wrappingKey = await deriveWrappingKey(password, kdf);
	const now = new Date().toISOString();
	return {
		metadata: {
			version: encryptedProfileMetadataVersion,
			enabled: migrationState === 'complete',
			kdf,
			wrappedDatabaseKey: wrapDatabaseKey(databaseKey, wrappingKey),
			cipher: {
				provider: 'sqlcipher' as const,
				version: 4 as const,
			},
			migrationState,
			createdAt: now,
			updatedAt: now,
		},
		databaseKeyHex: databaseKey.toString('hex'),
	};
};

export const unlockDatabaseKeyFromMetadata = async (password: string, metadata: EncryptedProfileMetadata) => {
	const wrappingKey = await deriveWrappingKey(password, metadata.kdf);
	try {
		const databaseKey = unwrapDatabaseKey(metadata.wrappedDatabaseKey, wrappingKey);
		if (databaseKey.length !== 32) return null;
		return databaseKey.toString('hex');
	} catch {
		return null;
	}
};

export const metadataContainsPassword = (metadata: EncryptedProfileMetadata, password: string) => {
	const serialized = JSON.stringify(metadata);
	return serialized.includes(password);
};

export const verifyDatabaseKeyMatchesMetadata = async (password: string, metadata: EncryptedProfileMetadata, expectedDatabaseKeyHex: string) => {
	const databaseKeyHex = await unlockDatabaseKeyFromMetadata(password, metadata);
	if (!databaseKeyHex) return false;
	const actual = Buffer.from(databaseKeyHex, 'hex');
	const expected = Buffer.from(expectedDatabaseKeyHex, 'hex');
	if (actual.length !== expected.length) return false;
	return timingSafeEqual(actual, expected);
};
