import {
	createEncryptedProfileMetadata,
	isEncryptedProfileMetadata,
	readEncryptedProfileMetadata,
	unlockDatabaseKeyFromMetadata,
	writeEncryptedProfileMetadata,
} from './metadata';
import { _ } from '../../locale';
import {
	encryptedProfileCooldownMs,
	encryptedProfileMaxFailedAttemptsBeforeCooldown,
	encryptedProfileMinPasswordLength,
	EncryptedProfileMetadata,
	EncryptedProfileRuntimeState,
	EncryptedProfileUnlockResult,
} from './types';

export type EncryptedProfileStartupAction = 'none' | 'migrate' | 'unlock' | 'errorSqlCipherUnavailable';

export {
	encryptedProfileCooldownMs,
	encryptedProfileMaxFailedAttemptsBeforeCooldown,
	encryptedProfileMinPasswordLength,
	isEncryptedProfileMetadata,
	readEncryptedProfileMetadata,
	writeEncryptedProfileMetadata,
	createEncryptedProfileMetadata,
	unlockDatabaseKeyFromMetadata,
};

export const validateEncryptedProfilePassword = (password: string) => {
	if (!password || password.length < encryptedProfileMinPasswordLength) {
		throw new Error(_('Encrypted profile password must be at least %d characters.', encryptedProfileMinPasswordLength));
	}
};

export const profileRequiresEncryptedUnlock = (metadata: EncryptedProfileMetadata | null) => {
	return !!metadata?.enabled && metadata.migrationState === 'complete';
};

export const profileRequiresPendingMigration = (metadata: EncryptedProfileMetadata | null) => {
	return metadata?.migrationState === 'pending';
};

export const decideEncryptedProfileStartupAction = (
	metadata: EncryptedProfileMetadata | null,
	sqlCipherAvailable: boolean,
): EncryptedProfileStartupAction => {
	const requiresPendingMigration = profileRequiresPendingMigration(metadata);
	const requiresUnlock = profileRequiresEncryptedUnlock(metadata);
	if ((requiresPendingMigration || requiresUnlock) && !sqlCipherAvailable) {
		return 'errorSqlCipherUnavailable';
	}
	if (requiresPendingMigration) return 'migrate';
	if (requiresUnlock) return 'unlock';
	return 'none';
};

export const createInitialRuntimeState = (): EncryptedProfileRuntimeState => ({
	failedAttempts: 0,
	cooldownUntil: 0,
	unlocked: false,
});

export const canAttemptEncryptedProfileUnlock = (state: EncryptedProfileRuntimeState, now = Date.now()) => {
	return !state.cooldownUntil || state.cooldownUntil <= now;
};

export const nextEncryptedProfileFailedUnlockState = (state: EncryptedProfileRuntimeState, now = Date.now()): EncryptedProfileRuntimeState => {
	const failedAttempts = state.failedAttempts + 1;
	const cooldownUntil = failedAttempts >= encryptedProfileMaxFailedAttemptsBeforeCooldown ? now + encryptedProfileCooldownMs : state.cooldownUntil;
	return {
		failedAttempts,
		cooldownUntil,
		unlocked: false,
	};
};

export const unlockEncryptedProfile = async (
	password: string,
	metadata: EncryptedProfileMetadata,
	state: EncryptedProfileRuntimeState,
): Promise<{ result: EncryptedProfileUnlockResult; state: EncryptedProfileRuntimeState }> => {
	if (!canAttemptEncryptedProfileUnlock(state)) {
		return {
			result: { success: false },
			state,
		};
	}

	const databaseKeyHex = await unlockDatabaseKeyFromMetadata(password, metadata);
	if (!databaseKeyHex) {
		const nextState = nextEncryptedProfileFailedUnlockState(state);
		return {
			result: { success: false },
			state: nextState,
		};
	}

	return {
		result: {
			success: true,
			databaseKeyHex,
		},
		state: {
			failedAttempts: 0,
			cooldownUntil: 0,
			unlocked: true,
		},
	};
};

// cSpell:disable
export const databaseKeyMustNotBeStoredInSettings = (settingKey: string) => {
	return !settingKey.toLowerCase().includes('databasekey') &&
		!settingKey.toLowerCase().includes('profiledatakey') &&
		!settingKey.toLowerCase().includes('encryptedprofilepassword');
};
// cSpell:enable
