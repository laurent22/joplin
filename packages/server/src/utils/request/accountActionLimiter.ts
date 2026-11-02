import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { ErrorTooManyRequests } from '../errors';
import { Uuid } from '../../services/database/types';

// Limits how often one account can do something, as opposed to bruteForceLimiter(), which limits the requests from
// one IP address
export default (maxActions: number, durationSeconds: number, errorMessage: string) => {
	const limiter = new RateLimiterMemory({
		points: maxActions,
		duration: durationSeconds,
	});

	return async (userId: Uuid) => {
		// Tests repeat these actions quickly, so the limiters are only enabled by the tests that check them
		if (process.env.JOPLIN_IS_TESTING === '1' && process.env.JOPLIN_TEST_ACCOUNT_ACTION_LIMITERS !== '1') return;

		try {
			await limiter.consume(userId);
		} catch (error) {
			const result = error as RateLimiterRes;
			if (result.msBeforeNext === undefined) throw error;
			throw new ErrorTooManyRequests(`${errorMessage}. Please try again in ${Math.ceil(result.msBeforeNext / 60_000)} minutes.`, result.msBeforeNext);
		}
	};
};
