/* eslint-disable import/prefer-default-export */

export function sessionIdFromHeaders(headers: any): string {
	return headers['x-api-auth'] ? headers['x-api-auth'] : '';
}
