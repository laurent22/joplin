import { PaginatedList, RemoteItem, getSupportsDeltaWithItems, isLocalServer } from './file-api';

const defaultPaginatedList = (): PaginatedList => {
	return {
		items: [],
		hasMore: false,
		context: null,
	};
};

const defaultItem = (): RemoteItem => {
	return {
		id: '',
	};
};

describe('file-api', () => {

	test.each([
		[
			{
				...defaultPaginatedList(),
				items: [],
			},
			false,
		],

		[
			{
				...defaultPaginatedList(),
				items: [
					{
						...defaultItem(),
						path: 'test',
					},
				],
			},
			false,
		],

		[
			{
				...defaultPaginatedList(),
				items: [
					{
						...defaultItem(),
						path: 'test',
						jopItem: null,
					},
				],
			},
			true,
		],

		[
			{
				...defaultPaginatedList(),
				items: [
					{
						...defaultItem(),
						path: 'test',
						jopItem: { something: 'abcd' },
					},
				],
			},
			true,
		],
	])('should tell if the sync target supports delta with items', async (deltaResponse: PaginatedList, expected: boolean) => {
		const actual = getSupportsDeltaWithItems(deltaResponse);
		expect(actual).toBe(expected);
	});

	it.each([
		'http://localhost',
		'http://localhost/',
		'https://localhost:8080',
		'http://127.0.0.1',
		'https://127.100.50.25:3000/test',
		'http://[::1]',
		'http://localhost/api/v1',
	])('should detect a local server url', (url: string) => {
		const result = isLocalServer(url);
		expect(result).toBe(true);
	});

	it.each([
		'http://localhostXYZ',
		'http://127.0.0.1foobar',
		'http://192.168.1.1',
		'http://example.com',
		'https://my-localhost.com',
	])('should detect a non local server url', (url: string) => {
		const result = isLocalServer(url);
		expect(result).toBe(false);
	});

});
