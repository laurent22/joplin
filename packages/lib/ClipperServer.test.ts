import { isAllowedPairingOrigin } from './ClipperServer';

describe('ClipperServer', () => {

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
