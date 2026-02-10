/* eslint-disable import/prefer-default-export */

import { ErrorUnprocessableEntity } from './errors';
export const validateEmail = (email: string) => {
	const s = email.split('@');
	if (s.length !== 2) throw new ErrorUnprocessableEntity(`Invalid email: ${email}`);
	if (!s[0].length || !s[1].length) throw new ErrorUnprocessableEntity(`Invalid email: ${email}`);
};
