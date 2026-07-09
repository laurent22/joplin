import {
	appLockHasPasswordHash,
	canAttemptUnlock,
	hashAppLockPassword,
	nextFailedUnlockState,
	shouldLockOnStartup,
	verifyAppLockPassword,
	maxFailedAttemptsBeforeCooldown,
	minPasswordLength,
} from './AppLockService';

describe('AppLockService', () => {
	it('hashes passwords without storing the original password', async () => {
		const password = 'correct horse battery staple';
		const hash = await hashAppLockPassword(password);

		expect(hash.algorithm).toBe('scrypt');
		expect(hash.salt).toBeTruthy();
		expect(hash.hash).toBeTruthy();
		expect(JSON.stringify(hash)).not.toContain(password);
	});

	it('verifies correct passwords and rejects incorrect passwords', async () => {
		const hash = await hashAppLockPassword('correct-password');

		expect(await verifyAppLockPassword('correct-password', hash)).toBe(true);
		expect(await verifyAppLockPassword('wrong-password', hash)).toBe(false);
	});

	it('rejects short or empty passwords', async () => {
		await expect(hashAppLockPassword('')).rejects.toThrow(`${minPasswordLength}`);
		await expect(hashAppLockPassword('12345')).rejects.toThrow(`${minPasswordLength}`);
	});

	it('starts a cooldown after repeated failed attempts', () => {
		const now = 1000;
		let state = { failedAttempts: 0, cooldownUntil: 0 };

		for (let i = 0; i < maxFailedAttemptsBeforeCooldown; i++) {
			state = nextFailedUnlockState(state, now);
		}

		expect(state.failedAttempts).toBe(maxFailedAttemptsBeforeCooldown);
		expect(state.cooldownUntil).toBeGreaterThan(now);
		expect(canAttemptUnlock(state, now)).toBe(false);
		expect(canAttemptUnlock(state, state.cooldownUntil + 1)).toBe(true);
	});

	it('initializes startup lock only when enabled and a password hash exists', async () => {
		const hash = await hashAppLockPassword('correct-password');

		expect(appLockHasPasswordHash(hash)).toBe(true);
		expect(shouldLockOnStartup({
			'security.appLock.enabled': true,
			'security.appLock.lockOnStartup': true,
			'security.appLock.passwordHash': hash,
		})).toBe(true);
		expect(shouldLockOnStartup({
			'security.appLock.enabled': true,
			'security.appLock.lockOnStartup': true,
			'security.appLock.passwordHash': {},
		})).toBe(false);
	});
});
