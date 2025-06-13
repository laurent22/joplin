/* eslint-disable import/prefer-default-export */

import { randomBytes } from 'crypto';

export const getSecureRandomString = (length: number): string => {
	const bytes = randomBytes(Math.ceil(length * 2));
	const randomString = bytes.toString('base64').replace(/[^a-zA-Z0-9]/g, '');
	return randomString.slice(0, length);
};
