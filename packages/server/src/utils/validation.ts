/* eslint-disable import/prefer-default-export */

import { ErrorUnprocessableEntity } from './errors';

export const organizationMinUsers = 2;
export const organizationMaxUsers = 100;

export const validateEmail = (email: string) => {
	const s = email.split('@');
	if (s.length !== 2) throw new ErrorUnprocessableEntity(`Invalid email: ${email}`);
	if (!s[0].length || !s[1].length) throw new ErrorUnprocessableEntity(`Invalid email: ${email}`);
};

export const validateOrganizationMaxUsers = (maxUsers: number) => {
	if (isNaN(maxUsers) || maxUsers < organizationMinUsers || maxUsers > organizationMaxUsers) throw new ErrorUnprocessableEntity(`Organisation must have at least ${organizationMinUsers} users`);
};
