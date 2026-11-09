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

	const isDisabled = () => process.env.JOPLIN_IS_TESTING === '1' && process.env.JOPLIN_TEST_ACCOUNT_ACTION_LIMITERS !== '1';

	const tooManyRequests = (result: RateLimiterRes) => new ErrorTooManyRequests(`${errorMessage}. Please try again in ${Math.ceil(result.msBeforeNext / 60_000)} minutes.`, result.msBeforeNext);

	// Counts one action, and refuses it if the limit has been reached
	const consume = async (userId: Uuid) => {
		// Tests repeat these actions quickly, so the limiters are only enabled by the tests that check them
		if (isDisabled()) return;

		try {
			await limiter.consume(userId);
		} catch (error) {
			const result = error as RateLimiterRes;
			if (result.msBeforeNext === undefined) throw error;
			throw tooManyRequests(result);
		}
	};

	// Refuses if the limit has been reached, without counting anything
	const check = async (userId: Uuid) => {
		if (isDisabled()) return;

		const result = await limiter.get(userId);
		if (result && result.remainingPoints <= 0) throw tooManyRequests(result);
	};

	return Object.assign(consume, { check });
};
