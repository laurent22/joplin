import {
	createEncryptedProfileMetadata,
	metadataContainsPassword,
	readEncryptedProfileMetadata,
	unlockDatabaseKeyFromMetadata,
	verifyDatabaseKeyMatchesMetadata,
	writeEncryptedProfileMetadata,
} from './metadata';
import {
	canAttemptEncryptedProfileUnlock,
	databaseKeyMustNotBeStoredInSettings,
	decideEncryptedProfileStartupAction,
	encryptedProfileMaxFailedAttemptsBeforeCooldown,
	encryptedProfileMinPasswordLength,
	profileRequiresEncryptedUnlock,
	profileRequiresPendingMigration,
	unlockEncryptedProfile,
	validateEncryptedProfilePassword,
} from './EncryptedProfileService';
import { buildMigrationPaths, rollbackMigration } from './migration';
import { encryptedProfileMetadataVersion } from './types';

describe('EncryptedProfile metadata and unlock', () => {
	const readFile = async (path: string) => {
		const fs = await import('fs-extra');
		return await fs.readFile(path, 'utf8');
	};

	const writeFile = async (path: string, content: string) => {
		const fs = await import('fs-extra');
		await fs.writeFile(path, content, 'utf8');
	};

	it('creates pending metadata with enabled=false', async () => {
		const password = 'correct-horse-battery-staple';
		const { metadata } = await createEncryptedProfileMetadata(password, 'pending');
		expect(metadata.enabled).toBe(false);
		expect(metadata.migrationState).toBe('pending');
	});

	it('creates complete metadata with enabled=true', async () => {
		const password = 'correct-horse-battery-staple';
		const { metadata } = await createEncryptedProfileMetadata(password, 'complete');
		expect(metadata.enabled).toBe(true);
		expect(metadata.migrationState).toBe('complete');
	});

	it('creates metadata with scrypt kdf params and wrapped database key', async () => {
		const password = 'correct-horse-battery-staple';
		const { metadata, databaseKeyHex } = await createEncryptedProfileMetadata(password, 'complete');

		expect(metadata.version).toBe(encryptedProfileMetadataVersion);
		expect(metadata.enabled).toBe(true);
		expect(metadata.kdf.algorithm).toBe('scrypt');
		expect(metadata.kdf.salt).toBeTruthy();
		expect(metadata.wrappedDatabaseKey.algorithm).toBe('aes-256-gcm');
		expect(databaseKeyHex).toHaveLength(64);
		expect(metadataContainsPassword(metadata, password)).toBe(false);
	});

	it('unlocks with the correct password and rejects incorrect passwords', async () => {
		const password = 'correct-horse-battery-staple';
		const { metadata, databaseKeyHex } = await createEncryptedProfileMetadata(password);

		expect(await unlockDatabaseKeyFromMetadata(password, metadata)).toBe(databaseKeyHex);
		expect(await unlockDatabaseKeyFromMetadata('wrong-password', metadata)).toBeNull();
	});

	it('rejects short or empty passwords in validate and create paths', async () => {
		expect(() => validateEncryptedProfilePassword('')).toThrow(`${encryptedProfileMinPasswordLength}`);
		expect(() => validateEncryptedProfilePassword('1234567')).toThrow(`${encryptedProfileMinPasswordLength}`);
		await expect(createEncryptedProfileMetadata('1234567', 'pending')).rejects.toThrow(`${encryptedProfileMinPasswordLength}`);
	});

	it('does not require unlock while migration is pending', async () => {
		const password = 'correct-horse-battery-staple';
		const { metadata } = await createEncryptedProfileMetadata(password, 'pending');
		expect(metadata.enabled).toBe(false);
		expect(profileRequiresEncryptedUnlock(metadata)).toBe(false);
		expect(profileRequiresPendingMigration(metadata)).toBe(true);
	});

	it('requires unlock only for complete and enabled metadata', async () => {
		const password = 'correct-horse-battery-staple';
		const { metadata: completeMetadata } = await createEncryptedProfileMetadata(password, 'complete');
		expect(profileRequiresEncryptedUnlock(completeMetadata)).toBe(true);
		expect(profileRequiresPendingMigration(completeMetadata)).toBe(false);

		const { metadata: pendingMetadata } = await createEncryptedProfileMetadata(password, 'pending');
		expect(profileRequiresEncryptedUnlock(pendingMetadata)).toBe(false);

		const failedMetadata = {
			...completeMetadata,
			enabled: false,
			migrationState: 'failed' as const,
		};
		expect(profileRequiresEncryptedUnlock(failedMetadata)).toBe(false);
		expect(profileRequiresPendingMigration(failedMetadata)).toBe(false);
	});

	it('decides startup action from metadata and SQLCipher availability', async () => {
		const password = 'correct-horse-battery-staple';
		const { metadata: pendingMetadata } = await createEncryptedProfileMetadata(password, 'pending');
		const { metadata: completeMetadata } = await createEncryptedProfileMetadata(password, 'complete');
		const failedMetadata = {
			...completeMetadata,
			enabled: false,
			migrationState: 'failed' as const,
		};

		expect(decideEncryptedProfileStartupAction(null, true)).toBe('none');
		expect(decideEncryptedProfileStartupAction(pendingMetadata, true)).toBe('migrate');
		expect(decideEncryptedProfileStartupAction(completeMetadata, true)).toBe('unlock');
		expect(decideEncryptedProfileStartupAction(failedMetadata, true)).toBe('none');
		expect(decideEncryptedProfileStartupAction(completeMetadata, false)).toBe('errorSqlCipherUnavailable');
		expect(decideEncryptedProfileStartupAction(pendingMetadata, false)).toBe('errorSqlCipherUnavailable');
	});

	it('enters cooldown after repeated failed unlock attempts', async () => {
		const password = 'correct-horse-battery-staple';
		const { metadata } = await createEncryptedProfileMetadata(password, 'complete');
		const now = 1000;
		let state = { failedAttempts: 0, cooldownUntil: 0, unlocked: false };

		for (let i = 0; i < encryptedProfileMaxFailedAttemptsBeforeCooldown; i++) {
			const output = await unlockEncryptedProfile('wrong-password', metadata, state);
			state = output.state;
		}

		expect(state.failedAttempts).toBe(encryptedProfileMaxFailedAttemptsBeforeCooldown);
		expect(state.cooldownUntil).toBeGreaterThan(now);
		expect(canAttemptEncryptedProfileUnlock(state, now)).toBe(false);
	});

	it('persists metadata without storing the plaintext password', async () => {
		const fs = await import('fs-extra');
		const os = await import('os');
		const path = await import('path');
		const profileDir = await fs.mkdtemp(path.join(os.tmpdir(), 'joplin-encrypted-profile-'));
		const password = 'correct-horse-battery-staple';
		const { metadata } = await createEncryptedProfileMetadata(password, 'complete');

		await writeEncryptedProfileMetadata(profileDir, metadata, writeFile);
		const loaded = await readEncryptedProfileMetadata(profileDir, readFile);

		expect(loaded).toBeTruthy();
		expect(JSON.stringify(loaded)).not.toContain(password);
		expect(profileRequiresEncryptedUnlock(loaded)).toBe(true);
	});

	it('does not allow database key setting keys in settings storage', () => {
		expect(databaseKeyMustNotBeStoredInSettings('security.encryptedProfile.databaseKey')).toBe(false);
		expect(databaseKeyMustNotBeStoredInSettings('security.appLock.enabled')).toBe(true);
	});

	it('verifies wrapped database key matches generated key material', async () => {
		const password = 'correct-horse-battery-staple';
		const { metadata, databaseKeyHex } = await createEncryptedProfileMetadata(password);
		expect(await verifyDatabaseKeyMatchesMetadata(password, metadata, databaseKeyHex)).toBe(true);
		expect(await verifyDatabaseKeyMatchesMetadata('wrong-password', metadata, databaseKeyHex)).toBe(false);
	});

	it('supports migration rollback from backup path helpers', async () => {
		const paths = buildMigrationPaths('/tmp/profile');
		expect(paths.backupDatabasePath).toContain('before-encryption-backup');
		const result = await rollbackMigration(paths, async () => {}, async () => {}, async () => false);
		expect(result).toBe('nothing-to-restore');
	});
});
