export function sessionIdFromHeaders(headers:any):string {
	return headers['x-api-auth'] ? headers['x-api-auth'] : '';
}
