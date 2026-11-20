import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { createHmac, randomBytes } from 'crypto';
import { ErrorTooManyRequests } from '../errors';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('accountBruteForceLimiter');

interface RunOptions {
	canBypassBlock?: boolean;
}

interface FailureOptions {
	isSecondFactor?: boolean;
	// For a code that changes over time, such as a TOTP code, a repeated attempt is a new guess
	countRepeats?: boolean;
}

export interface AccountBruteForceLimiter {
	// Refuses if the account is blocked, otherwise runs `attempt`. Attempts on one account run one at a time, so that
	// concurrent guesses cannot all get past the check before the first of them is counted. With `canBypassBlock`,
	// `attempt` also runs when the account is blocked, and receives the error to throw unless it fully succeeds.
	run: <T>(key: string, attempt: (blockedError: ErrorTooManyRequests | null)=> Promise<T>, options?: RunOptions)=> Promise<T>;
	// `attempt` is the rejected credential. The same one is only counted once per window, since repeating it is what a
	// device with an outdated password does, while guessing needs different ones. A rejected second factor, such as an
	// MFA code, is also counted separately, see canTrySecondFactor().
	onFailure: (key: string, attempt: string, options?: FailureOptions)=> Promise<void>;
	// Whether a second factor may still be tried while the account is blocked. Only someone who knows the password can
	// use up this count, so a stranger who blocks the account cannot stop the owner from logging in with MFA.
	canTrySecondFactor: (key: string)=> Promise<boolean>;
	onSuccess: (key: string)=> Promise<void>;
	// For tests only - the counts are in memory and otherwise persist for the
	// lifetime of the process.
	reset: ()=> Promise<void>;
}

// Limits failed attempts for one account, as opposed to bruteForceLimiter(),
// which limits the request rate from one IP. An attacker with several IP
// addresses stays under a per-IP limit indefinitely, and one willing to pace
// themselves stays under a per-minute limit as well, so the account is the only
// invariant worth counting against.
//
// Only failures are counted, so a user logging in normally is never affected,
// and a successful login clears the count.
export default (maxFailures: number, durationSeconds: number, errorMessage: string): AccountBruteForceLimiter => {
	const limiter = new RateLimiterMemory({
		points: maxFailures,
		duration: durationSeconds,
	});

	const secondFactorLimiter = new RateLimiterMemory({
		points: maxFailures,
		duration: durationSeconds,
	});

	const newSeenAttempts = () => new RateLimiterMemory({ points: 1, duration: durationSeconds });
	let seenAttempts = newSeenAttempts();

	// Only a keyed hash of each attempt is kept, and the key never leaves the process
	const attemptHashKey = randomBytes(32);
	const attemptHash = (key: string, attempt: string) => createHmac('sha256', attemptHashKey).update(`${key}\n${attempt}`).digest('hex');

	const isTesting = () => process.env.JOPLIN_IS_TESTING === '1' && process.env.JOPLIN_TEST_ACCOUNT_LIMITER !== '1';

	// Only needed by reset() in tests. Outside tests it would keep every submitted key for the lifetime of the process.
	const trackedKeys = new Set<string>();

	const normalise = (key: string) => {
		const output = (key || '').trim().toLowerCase();
		if (process.env.JOPLIN_IS_TESTING === '1') trackedKeys.add(output);
		return output;
	};

	const blockedError = async (normalisedKey: string) => {
		if (isTesting()) return null;

		const result = await limiter.get(normalisedKey);
		if (result && result.remainingPoints <= 0) {
			return new ErrorTooManyRequests(`${errorMessage}. Please try again in ${Math.ceil(result.msBeforeNext / 1000)} seconds.`, result.msBeforeNext);
		}
		return null;
	};

	const consume = async (rateLimiter: RateLimiterMemory, normalisedKey: string) => {
		try {
			return await rateLimiter.consume(normalisedKey);
		} catch (error) {
			// Consuming the last point rejects, but the caller is already
			// reporting an authentication failure, so the block applies to
			// the next attempt rather than this one.
			const result = error as RateLimiterRes;
			if (result.msBeforeNext === undefined) throw error;
			return result;
		}
	};

	const pendingAttempts = new Map<string, Promise<unknown>>();

	return {
		run: async <T>(key: string, attempt: (blockedError: ErrorTooManyRequests | null)=> Promise<T>, options: RunOptions = {}) => {
			const normalisedKey = normalise(key);

			const previous = pendingAttempts.get(normalisedKey);
			const current = (async () => {
				try {
					await previous;
				} catch { /* reported to its own caller */ }
				const blocked = await blockedError(normalisedKey);
				if (blocked && !options.canBypassBlock) throw blocked;
				return attempt(blocked);
			})();
			pendingAttempts.set(normalisedKey, current);

			try {
				return await current;
			} finally {
				if (pendingAttempts.get(normalisedKey) === current) pendingAttempts.delete(normalisedKey);
			}
		},

		onFailure: async (key: string, attempt: string, options: FailureOptions = {}) => {
			if (isTesting()) return;

			const normalisedKey = normalise(key);
			if (!options.countRepeats) {
				const hash = attemptHash(normalisedKey, attempt || '');
				if (await seenAttempts.get(hash)) return;
				await seenAttempts.set(hash, 1, durationSeconds);
			}

			const result = await consume(limiter, normalisedKey);
			if (result.remainingPoints === 0 && result.consumedPoints === maxFailures) logger.warn(`${errorMessage}: ${normalisedKey} is blocked for ${Math.ceil(result.msBeforeNext / 1000)} seconds`);
			if (options.isSecondFactor) await consume(secondFactorLimiter, normalisedKey);
		},

		canTrySecondFactor: async (key: string) => {
			if (isTesting()) return true;
			const result = await secondFactorLimiter.get(normalise(key));
			return !result || result.remainingPoints > 0;
		},

		onSuccess: async (key: string) => {
			if (isTesting()) return;
			const normalisedKey = normalise(key);
			await limiter.delete(normalisedKey);
			await secondFactorLimiter.delete(normalisedKey);
		},

		reset: async () => {
			for (const key of trackedKeys) {
				await limiter.delete(key);
				await secondFactorLimiter.delete(key);
			}
			trackedKeys.clear();
			seenAttempts = newSeenAttempts();
		},
	};
};
