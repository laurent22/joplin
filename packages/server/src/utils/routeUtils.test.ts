import { findMatchingRoute, isValidOrigin, parseSubPath, splitItemPath, urlMatchesSchema } from './routeUtils';
import { ItemAddressingType } from '../services/database/types';
import { RouteType } from './types';
import { expectThrow } from './testing/testUtils';

describe('routeUtils', () => {

	it('should parse a route path', async () => {
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

	it('should find a matching route', async () => {
		const testCases: any[] = [
			['/admin/organizations', {
				route: 1,
				basePath: 'admin/organizations',
				subPath: {
					id: '',
					link: '',
					addressingType: 1,
					raw: '',
					schema: 'admin/organizations',
				},
			}],

			['/api/users/123', {
				route: 2,
				basePath: 'api/users',
				subPath: {
					id: '123',
					link: '',
					addressingType: 1,
					raw: '123',
					schema: 'api/users/:id',
				},
			}],

			['/help', {
				route: 3,
				basePath: 'help',
				subPath: {
					id: '',
					link: '',
					addressingType: 1,
					raw: '',
					schema: 'help',
				},
			}],
		];

		const routes: Record<string, any> = {
			'admin/organizations': 1,
			'api/users': 2,
			'help': 3,
		};

		for (const testCase of testCases) {
			const [path, expected] = testCase;
			const actual = findMatchingRoute(path, routes);
			expect(actual).toEqual(expected);
		}

		await expectThrow(async () => findMatchingRoute('help', routes));
		await expectThrow(async () => findMatchingRoute('api/users/123', routes));
	});

	it('should split an item path', async () => {
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

	it('should check the request origin for API URLs', async () => {
		const testCases: [string, string, boolean][] = [
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

	it('should check the request origin for User Content URLs', async () => {
		const testCases: [string, string, boolean][] = [
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

	it('should check if a URL matches a schema', async () => {
		const testCases: [string, string, boolean][] = [
			[
				'https://test.com/items/123/children',
				'items/:id/children',
				true,
			],
			[
				'https://test.com/items/123',
				'items/:id',
				true,
			],
			[
				'https://test.com/items',
				'items',
				true,
			],
			[
				'https://test.com/items/123/children',
				'items/:id',
				false,
			],
			[
				'',
				'items/:id',
				false,
			],
		];

		for (const testCase of testCases) {
			const [url, schema, expected] = testCase;
			const actual = urlMatchesSchema(url, schema);
			expect(actual).toBe(expected);
		}
	});

});
