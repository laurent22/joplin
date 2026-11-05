import accountActionLimiter from './accountActionLimiter';

// The app login codes are short enough to be typed, and a guess is checked against every pending code, so failures are
// limited across the whole server rather than per IP address, which an attacker can change. While the limit is reached,
// nobody can log in with a code, but that is better than letting codes be guessed.
const limiter = accountActionLimiter(1000, 60 * 60, 'Too many invalid login codes');
const key = 'all';

export const checkLoginCodeFailures = () => limiter.check(key);
export const countLoginCodeFailure = () => limiter(key);
