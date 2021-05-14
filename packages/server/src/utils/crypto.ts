/* eslint-disable import/prefer-default-export */

import { createHash } from 'crypto';

export function md5(string: string): string {
	return createHash('md5').update(string).digest('hex');
}
