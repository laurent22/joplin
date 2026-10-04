import { isAllowedPairingOrigin, isPairingPath } from './ClipperServer';

describe('ClipperServer', () => {

	test.each([
		// The router strips all leading slashes, so the gate must too, otherwise
		// e.g. //auth would skip the check but still reach the auth handler.
		['/auth', true],
		['/auth/check', true],
		['//auth', true],
		['///auth/check', true],
		['auth', true],
		['/notes', false],
		['/auth_other', false],
		['', false],
	])('should identify pairing path %s -> %s', (pathname, expected) => {
		expect(isPairingPath(pathname)).toBe(expected);
	});

	test.each([
		// Web origins must be rejected: these are the CSRF vector.
		['http://attacker.example', false],
		['https://attacker.example', false],
		['http://127.0.0.1:41184', false],
		['https://localhost', false],

		// Extension origins are the legitimate caller.
		['chrome-extension://some-extension-id', true],
		['moz-extension://11111111-2222-3333-4444-555555555555', true],
		['safari-web-extension://ABCDEF', true],

		// No Origin (native clients, curl) is not a browser CSRF vector.
		['', true],
		[undefined as unknown as string, true],

		// Malformed origins are rejected.
		['not a url', false],
	])('should decide pairing origin %s -> %s', (origin, expected) => {
		expect(isAllowedPairingOrigin(origin)).toBe(expected);
	});
});
