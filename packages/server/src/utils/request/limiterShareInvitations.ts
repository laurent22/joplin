import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { ErrorTooManyRequests } from '../errors';
import { Uuid } from '../../services/database/types';

// Each invitation tells the sharer whether an email address has an account, so an account that can share a notebook
// could otherwise check any number of addresses.
const limiter = new RateLimiterMemory({
	points: 50,
	duration: 60 * 60,
});

export default async (userId: Uuid) => {
	if (process.env.JOPLIN_IS_TESTING === '1' && process.env.JOPLIN_TEST_SHARE_INVITATION_LIMITER !== '1') return;

	try {
		await limiter.consume(userId);
	} catch (error) {
		const result = error as RateLimiterRes;
		if (result.msBeforeNext === undefined) throw error;
		throw new ErrorTooManyRequests(`Too many invitations. Please try again in ${Math.ceil(result.msBeforeNext / 60_000)} minutes.`, result.msBeforeNext);
	}
};
