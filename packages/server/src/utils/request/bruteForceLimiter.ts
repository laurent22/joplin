import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { ErrorTooManyRequests } from '../errors';

export default (maxRequestsPerMinute: number, errorMessage: string) => {
	const limiter = new RateLimiterMemory({
		points: maxRequestsPerMinute,
		duration: 60, // Per 60 seconds
	});

	return async (ip: string) => {
		// Tests need to make many requests quickly so we disable it in this case.
		if (process.env.JOPLIN_IS_TESTING === '1') return;

		try {
			await limiter.consume(ip);
		} catch (error) {
			const result = error as RateLimiterRes;
			throw new ErrorTooManyRequests(`${errorMessage}. Please try again in ${Math.ceil(result.msBeforeNext / 1000)} seconds.`, result.msBeforeNext);
		}
	};
};
