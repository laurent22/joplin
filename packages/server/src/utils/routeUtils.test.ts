import { isValidOrigin, parseSubPath, splitItemPath } from './routeUtils';
import { ItemAddressingType } from '../db';
import { RouteType } from './types';

describe('routeUtils', function() {

	it('should parse a route path', async function() {
		const testCases: any[] = [
			['123456/content', '123456', 'content', ItemAddressingType.Id],
			['123456', '123456', '', ItemAddressingType.Id],
			['root:/Documents/MyFile.md:/content', 'root:/Documents/MyFile.md:', 'content', ItemAddressingType.Path],
			['root:/Documents/MyFile.md:', 'root:/Documents/MyFile.md:', '', ItemAddressingType.Path],
			['', '', '', ItemAddressingType.Id],
		];

		for (const t of testCases) {
			const path = t[0];
			const id = t[1];
			const link = t[2];
			const addressingType = t[3];

			const parsed = parseSubPath('', path);
			expect(parsed.id).toBe(id);
			expect(parsed.link).toBe(link);
			expect(parsed.addressingType).toBe(addressingType);
		}
	});

	it('should split an item path', async function() {
		const testCases: any[] = [
			['root:/Documents/MyFile.md:', ['root', 'Documents', 'MyFile.md']],
			['documents:/CV.doc:', ['documents', 'CV.doc']],
			['', []],
		];

		for (const t of testCases) {
			const path = t[0];
			const expected = t[1];
			const splitted = splitItemPath(path);

			expect(JSON.stringify(splitted)).toBe(JSON.stringify(expected));
		}
	});

	it('should check the request origin for API URLs', async function() {
		const testCases: any[] = [
			[
				'https://example.com', // Request origin
				'https://example.com', // Config base URL
				true,
			],
			[
				// Apache ProxyPreserveHost somehow converts https:// to http://
				// but in this context it's valid as only the domain matters.
				'http://example.com',
				'https://example.com',
				true,
			],
			[
				// With Apache ProxyPreserveHost, the request might be eg
				// https://example.com/joplin/api/ping but the origin part, as
				// forwarded by Apache will be https://example.com/api/ping
				// (without /joplin). In that case the request is valid anyway
				// since we only care about the domain.
				'https://example.com',
				'https://example.com/joplin',
				true,
			],
			[
				'https://bad.com',
				'https://example.com',
				false,
			],
			[
				'http://bad.com',
				'https://example.com',
				false,
			],
		];

		for (const testCase of testCases) {
			const [requestOrigin, configBaseUrl, expected] = testCase;
			expect(isValidOrigin(requestOrigin, configBaseUrl, RouteType.Api)).toBe(expected);
		}
	});

	it('should check the request origin for User Content URLs', async function() {
		const testCases: any[] = [
			[
				'https://usercontent.local', // Request origin
				'https://usercontent.local', // Config base URL
				true,
			],
			[
				'http://usercontent.local',
				'https://usercontent.local',
				true,
			],
			[
				'https://abcd.usercontent.local',
				'https://usercontent.local',
				true,
			],
			[
				'https://bad.local',
				'https://usercontent.local',
				false,
			],
		];

		for (const testCase of testCases) {
			const [requestOrigin, configBaseUrl, expected] = testCase;
			expect(isValidOrigin(requestOrigin, configBaseUrl, RouteType.UserContent)).toBe(expected);
		}
	});

});
