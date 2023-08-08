import { isHashedPassword } from './user';

describe('isHashedPassword', () => {

	it('should be true if password starts with $2a$10', () => {
		expect(isHashedPassword('$2a$10$LMKVPiNOWDZhtw9NizNIEuNGLsjOxQAcrwQJ0lnKuiaOtyFgZEnwO')).toBe(true);
	});

	it.each(
		[
			'password',
			'123456',
			'simple-password-that-takes-is-long',
			'nuXUhqecx!RzK3wv6^xYaVEP%9fc$T%$E2k%9Q&TKvtDhR#2PUw3kA8KX3w2baAD8m#N9@52!DvfYn*X6hP#uAvpGF57*H9avcoePbR&4Q2XzckJnSW*EVm4G@a#YvnR',
		]
	)('should be false if password starts with $2a$10: %', (password) => {
		expect(isHashedPassword(password)).toBe(false);
	});
});
