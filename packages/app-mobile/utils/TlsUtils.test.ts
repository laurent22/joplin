import { hostAndPortFromUrl } from './TlsUtils';

describe('TlsUtils', () => {
	test.each([
		['https://example.com', { host: 'example.com', port: 443 }],
		['https://example.com/', { host: 'example.com', port: 443 }],
		['http://example.com', { host: 'example.com', port: 80 }],
		['https://notes.example.com:8443/joplin', { host: 'notes.example.com', port: 8443 }],
		['HTTPS://Example.com:22300', { host: 'Example.com', port: 22300 }],
		['https://user:secret@example.com/dav', { host: 'example.com', port: 443 }],
		['https://[2001:db8::1]:8443/', { host: '[2001:db8::1]', port: 8443 }],
		['  https://example.com  ', { host: 'example.com', port: 443 }],
	])('should get host and port from %s', (url, expected) => {
		expect(hostAndPortFromUrl(url)).toEqual(expected);
	});

	test.each([
		[''],
		['example.com'],
		['/storage/emulated/0/Joplin'],
		[null],
	])('should not fail on invalid URL %s', (url) => {
		expect(hostAndPortFromUrl(url)).toEqual({ host: null, port: -1 });
	});
});
