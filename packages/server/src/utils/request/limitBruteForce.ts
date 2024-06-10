import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { ErrorTooManyRequests } from '../errors';

export const loginLimiterByIp = new RateLimiterMemory({
	points: 10, // Up to 10 requests per IP
	duration: 60, // Per 60 seconds
});

export const bruteForceLimiterByIp = new RateLimiterMemory({
	points: 100,
	duration: 60,
});

export default async function(ip: string, limiter: RateLimiterMemory) {
	// Tests need to make many requests quickly so we disable it in this case.
	if (process.env.JOPLIN_IS_TESTING === '1') return;

	try {
		await limiter.consume(ip);
	} catch (error) {
		const result = error as RateLimiterRes;
		throw new ErrorTooManyRequests(`Too many request attempts. Please try again in ${Math.ceil(result.msBeforeNext / 1000)} seconds.`, result.msBeforeNext);
	}
}
