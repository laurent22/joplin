import { hashPassword } from './auth';

describe('hashPassword', () => {

	it.each(
		[
			'password',
			'123456',
			'simple-password-that-takes-is-long',
			'nuXUhqecx!RzK3wv6^xYaVEP%9fc$T%$E2k%9Q&TKvtDhR#2PUw3kA8KX3w2baAD8m#N9@52!DvfYn*X6hP#uAvpGF57*H9avcoePbR&4Q2XzckJnSW*EVm4G@a#YvnR',
			'$2a$10',
			'$2a$10$LMKVPiNOWDZhtw9NizNIEuNGLsjOxQAcrwQJ0lnKuiaOtyFgZEnwO',
		],
	)('should return a string that starts with $2a$10 for the password: %', async (plainText) => {
		expect(hashPassword(plainText).startsWith('$2a$10')).toBe(true);
	});

});
