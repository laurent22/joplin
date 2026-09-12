import bruteForceLimiter from './bruteForceLimiter';

export default bruteForceLimiter(
	10, // Up to 10 requests per minute per IP
	'Too many login attempts',
);
