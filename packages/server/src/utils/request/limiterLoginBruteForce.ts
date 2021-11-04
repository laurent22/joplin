import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { ErrorTooManyRequests } from '../errors';

const limiterSlowBruteByIP = new RateLimiterMemory({
	points: 10, // Up to 10 requests per IP
	duration: 60, // Per 60 seconds
});

export default async function(ip: string) {
	// Tests need to make many requests quickly so we disable it in this case.
	if (process.env.JOPLIN_IS_TESTING === '1') return;

	try {
		await limiterSlowBruteByIP.consume(ip);
	} catch (error) {
		const result = error as RateLimiterRes;
		throw new ErrorTooManyRequests(`Too many login attempts. Please try again in ${Math.ceil(result.msBeforeNext / 1000)} seconds.`, result.msBeforeNext);
	}
}
