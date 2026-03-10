import * as bcrypt from 'bcryptjs';

/** Hashes a plaintext password using bcrypt with a generated salt. */
export async function hashPassword(password: string): Promise<string> {
	const salt = await bcrypt.genSalt(10);
	return bcrypt.hash(password, salt);
}

/** Compares a plaintext password against a bcrypt hash. */
export async function checkPassword(password: string, hash: string): Promise<boolean> {
	return bcrypt.compare(password, hash);
}

/** Checks whether a string is a bcrypt hash rather than a plaintext password. */
export const isHashedPassword = (password: string) => {
	return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(password);
};

