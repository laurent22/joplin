/* eslint-disable import/prefer-default-export */

import { URL } from 'url';

export function setQueryParameters(url: string, query: any): string {
	if (!query) return url;

	const u = new URL(url);

	for (const k of Object.keys(query)) {
		u.searchParams.set(k, query[k]);
	}

	return u.toString();
}
