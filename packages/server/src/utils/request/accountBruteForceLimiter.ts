import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { ErrorTooManyRequests } from '../errors';

export interface AccountBruteForceLimiter {
	check: (key: string)=> Promise<void>;
	onFailure: (key: string)=> Promise<void>;
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

	const isTesting = () => process.env.JOPLIN_IS_TESTING === '1' && process.env.JOPLIN_TEST_ACCOUNT_LIMITER !== '1';

	const trackedKeys = new Set<string>();

	const normalise = (key: string) => {
		const output = (key || '').trim().toLowerCase();
		trackedKeys.add(output);
		return output;
	};

	return {
		check: async (key: string) => {
			if (isTesting()) return;

			const result = await limiter.get(normalise(key));
			if (result && result.remainingPoints <= 0) {
				throw new ErrorTooManyRequests(`${errorMessage}. Please try again in ${Math.ceil(result.msBeforeNext / 1000)} seconds.`, result.msBeforeNext);
			}
		},

		onFailure: async (key: string) => {
			if (isTesting()) return;

			try {
				await limiter.consume(normalise(key));
			} catch (error) {
				// Consuming the last point rejects, but the caller is already
				// reporting an authentication failure, so the block applies to
				// the next attempt rather than this one.
				const result = error as RateLimiterRes;
				if (result.msBeforeNext === undefined) throw error;
			}
		},

		onSuccess: async (key: string) => {
			if (isTesting()) return;
			await limiter.delete(normalise(key));
		},

		reset: async () => {
			for (const key of trackedKeys) await limiter.delete(key);
			trackedKeys.clear();
		},
	};
};
