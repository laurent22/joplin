/* eslint-disable import/prefer-default-export */

import { ErrorUnprocessableEntity } from './errors';
export const validateEmail = (email: string) => {
	const s = email.split('@');
	if (s.length !== 2) throw new ErrorUnprocessableEntity(`Invalid email: ${email}`);
	if (!s[0].length || !s[1].length) throw new ErrorUnprocessableEntity(`Invalid email: ${email}`);
};

// For an address that an email is about to be sent to. Stricter than validateEmail(), so that it is a single address,
// without anything a mailer could read as several recipients or as a display name.
export const isValidEmailRecipient = (email: string) => {
	if (!email || email.length > 254 || /[\s,;<>"()]/.test(email)) return false;
	const s = email.split('@');
	return s.length === 2 && !!s[0].length && !!s[1].length;
};

