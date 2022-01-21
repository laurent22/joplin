/* eslint-disable import/prefer-default-export */

import { Organization } from './types';

export const organizationDefaultValues = (): Organization => {
	return {
		max_users: 2,
	};
};
