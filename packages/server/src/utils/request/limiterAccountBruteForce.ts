import bruteForceLimiter from './bruteForceLimiter';

export const limiterSignupBruteForce = bruteForceLimiter(
	10,
	'Too many sign up attempts',
);

export const limiterForgotPasswordBruteForce = bruteForceLimiter(
	10,
	'Too many password reset requests',
);
