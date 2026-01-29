import { sanitizeUserUrl } from './urlUtils';

describe('urlUtils', () => {
	test('sanitizeUserUrl should return # for dangerous URLs', () => {
		expect(sanitizeUserUrl('randomProtocol://foo')).toBe('#');
		expect(sanitizeUserUrl('javascript:foo')).toBe('#');
		expect(sanitizeUserUrl('example.com')).toBe('#');
		expect(sanitizeUserUrl('https://example.com/')).toBe('https://example.com/');
	});
});
