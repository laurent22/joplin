const bcrypt = require('bcryptjs');

export function hashPassword(password: string): string {
	const salt = bcrypt.genSaltSync(10);
	return bcrypt.hashSync(password, salt);
}

export function checkPassword(password: string, hash: string): boolean {
	return bcrypt.compareSync(password, hash);
}
