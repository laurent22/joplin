import * as bcrypt from 'bcryptjs';

export async function hashPassword(password: string): Promise<string> {
	const salt = await bcrypt.genSalt(10);
	return bcrypt.hash(password, salt);
}

export async function checkPassword(password: string, hash: string): Promise<boolean> {
	return bcrypt.compare(password, hash);
}

export const isHashedPassword = (password: string) => {
	return password.startsWith('$2a$10');
};
