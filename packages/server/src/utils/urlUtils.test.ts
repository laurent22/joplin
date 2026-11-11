import { isSameSite, sanitizeUserUrl } from './urlUtils';

describe('urlUtils', () => {

	test.each([
		['https://joplin.example.com', 'https://usercontent.example.com', true],
		['https://joplin.example.com', 'https://abc.usercontent.example.com', true],
		['https://joplin.example.com', 'https://example.com', true],
		['https://joplincloud.com', 'https://joplinusercontent.com', false],
		['http://localhost:22300', 'http://localhost:22301', true],
		['http://192.168.1.10:22300', 'http://192.168.1.11:22300', false],
	])('should tell if %s and %s are the same site', (url1, url2, expected) => {
		expect(isSameSite(url1, url2)).toBe(expected);
	});
	test('sanitizeUserUrl should return # for dangerous URLs', () => {
		expect(sanitizeUserUrl('randomProtocol://foo')).toBe('#');
		expect(sanitizeUserUrl('javascript:foo')).toBe('#');
		expect(sanitizeUserUrl('example.com')).toBe('#');
		expect(sanitizeUserUrl('https://example.com/')).toBe('https://example.com/');
	});
});
