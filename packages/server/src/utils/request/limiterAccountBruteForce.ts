import accountBruteForceLimiter from './accountBruteForceLimiter';
import bruteForceLimiter from './bruteForceLimiter';

export const limiterSignupBruteForce = bruteForceLimiter(
	10,
	'Too many sign up attempts',
);

export const limiterForgotPasswordBruteForce = bruteForceLimiter(
	10,
	'Too many password reset requests',
);

// Ten failures for the same account within an hour, regardless of where the
// requests come from. A legitimate user who has forgotten their password does
// not get near this, and a successful login resets the count.
export const limiterLoginAccountBruteForce = accountBruteForceLimiter(
	10,
	60 * 60,
	'Too many failed login attempts for this account',
);
