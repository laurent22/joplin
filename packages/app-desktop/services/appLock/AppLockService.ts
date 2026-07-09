import { randomBytes, scrypt as scryptCallback, ScryptOptions, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import Setting from '@joplin/lib/models/Setting';
import { _ } from '@joplin/lib/locale';

const scrypt = promisify((
	password: string,
	salt: string,
	keyLength: number,
	options: ScryptOptions,
	callback: (error: Error, derivedKey: Buffer)=> void,
) => {
	scryptCallback(password, salt, keyLength, options, callback);
});

export interface AppLockPasswordHash {
	version: 1;
	algorithm: 'scrypt';
	salt: string;
	hash: string;
	keyLength: number;
	cost: number;
	blockSize: number;
	parallelization: number;
}

export interface AppLockRuntimeState {
	failedAttempts: number;
	cooldownUntil: number;
}

export const minPasswordLength = 6;
export const maxFailedAttemptsBeforeCooldown = 5;
export const cooldownMs = 30 * 1000;

const hashOptions = {
	keyLength: 64,
	cost: 16384,
	blockSize: 8,
	parallelization: 1,
};

const isPasswordHash = (value: unknown): value is AppLockPasswordHash => {
	if (!value || typeof value !== 'object') return false;
	const item = value as Partial<AppLockPasswordHash>;
	return item.version === 1 &&
		item.algorithm === 'scrypt' &&
		typeof item.salt === 'string' &&
		typeof item.hash === 'string' &&
		typeof item.keyLength === 'number' &&
		typeof item.cost === 'number' &&
		typeof item.blockSize === 'number' &&
		typeof item.parallelization === 'number';
};

export const appLockHasPasswordHash = (value: unknown = Setting.value('security.appLock.passwordHash')): boolean => {
	return isPasswordHash(value);
};

export const validateAppLockPassword = (password: string) => {
	if (!password || password.length < minPasswordLength) {
		throw new Error(_('App Lock password must be at least %d characters.', minPasswordLength));
	}
};

export const hashAppLockPassword = async (password: string): Promise<AppLockPasswordHash> => {
	validateAppLockPassword(password);

	const salt = randomBytes(16).toString('base64');
	const derivedKey = await scrypt(password, salt, hashOptions.keyLength, {
		cost: hashOptions.cost,
		blockSize: hashOptions.blockSize,
		parallelization: hashOptions.parallelization,
	}) as Buffer;

	return {
		version: 1,
		algorithm: 'scrypt',
		salt,
		hash: derivedKey.toString('base64'),
		...hashOptions,
	};
};

export const verifyAppLockPassword = async (password: string, storedHash: unknown = Setting.value('security.appLock.passwordHash')): Promise<boolean> => {
	if (!isPasswordHash(storedHash)) return false;

	const derivedKey = await scrypt(password, storedHash.salt, storedHash.keyLength, {
		cost: storedHash.cost,
		blockSize: storedHash.blockSize,
		parallelization: storedHash.parallelization,
	}) as Buffer;

	const expected = Buffer.from(storedHash.hash, 'base64');
	if (expected.length !== derivedKey.length) return false;

	return timingSafeEqual(expected, derivedKey);
};

export const nextFailedUnlockState = (state: AppLockRuntimeState, now = Date.now()): AppLockRuntimeState => {
	const failedAttempts = state.failedAttempts + 1;
	const cooldownUntil = failedAttempts >= maxFailedAttemptsBeforeCooldown ? now + cooldownMs : state.cooldownUntil;

	return {
		failedAttempts,
		cooldownUntil,
	};
};

export const canAttemptUnlock = (state: AppLockRuntimeState, now = Date.now()): boolean => {
	return !state.cooldownUntil || state.cooldownUntil <= now;
};

export const shouldLockOnStartup = (settings: Record<string, unknown> = Setting.toPlainObject()): boolean => {
	return !!settings['security.appLock.enabled'] &&
		!!settings['security.appLock.lockOnStartup'] &&
		appLockHasPasswordHash(settings['security.appLock.passwordHash']);
};

export const clearAppLockPassword = async () => {
	Setting.setValue('security.appLock.passwordHash', {});
	Setting.setValue('security.appLock.enabled', false);
	await Setting.saveAll();
};

export const setAppLockPassword = async (password: string) => {
	const passwordHash = await hashAppLockPassword(password);
	Setting.setValue('security.appLock.passwordHash', passwordHash as unknown as Record<string, unknown>);
	Setting.setValue('security.appLock.enabled', true);
	await Setting.saveAll();
	return passwordHash;
};
