import { PaginatedList, RemoteItem, getSupportsDeltaWithItems } from './file-api';

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

});
