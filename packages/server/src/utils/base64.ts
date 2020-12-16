export function encodeBase64(s: string): string {
	return Buffer.from(s).toString('base64');
}

export function decodeBase64(s: string): string {
	return Buffer.from(s, 'base64').toString('utf8');
}
