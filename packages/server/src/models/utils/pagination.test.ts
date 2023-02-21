import { expectThrow } from '../../utils/testing/testUtils';
import { defaultPagination, Pagination, createPaginationLinks, requestPagination } from './pagination';

describe('pagination', () => {

	test('should create options from request query parameters', async () => {
		const d = defaultPagination();

		const testCases: any = [
			[
				null,
				d,
			],
			[
				{
					order_by: 'title',
				},
				{
					...d,
					order: [{
						by: 'title',
						dir: d.order[0].dir,
					}],
				},
			],
			[
				{
					order_by: 'title',
					order_dir: 'asc',
				},
				{
					...d,
					order: [{
						by: 'title',
						dir: 'asc',
					}],
				},
			],
			[
				{
					limit: 55,
				},
				{
					...d,
					limit: 55,
				},
			],
			[
				{
					page: 3,
				},
				{
					...d,
					page: 3,
				},
			],
		];

		for (const t of testCases) {
			const input: any = t[0];
			const expected: Pagination = t[1];
			const actual: Pagination = requestPagination(input);

			expect(actual).toEqual(expected);
		}

		await expectThrow(async () => requestPagination({ order_dir: 'ASC' }));
		await expectThrow(async () => requestPagination({ order_dir: 'DESC' }));
		await expectThrow(async () => requestPagination({ page: 0 }));
	});

	test('should create page link logic', async () => {
		expect(createPaginationLinks(1, 5)).toEqual([
			{ page: 1, isCurrent: true },
			{ page: 2 },
			{ page: 3 },
			{ page: 4 },
			{ page: 5 },
		]);

		expect(createPaginationLinks(3, 5)).toEqual([
			{ page: 1 },
			{ page: 2 },
			{ page: 3, isCurrent: true },
			{ page: 4 },
			{ page: 5 },
		]);

		expect(createPaginationLinks(1, 10)).toEqual([
			{ page: 1, isCurrent: true },
			{ page: 2 },
			{ page: 3 },
			{ page: 4 },
			{ page: 5 },
			{ isEllipsis: true },
			{ page: 9 },
			{ page: 10 },
		]);

		expect(createPaginationLinks(10, 20)).toEqual([
			{ page: 1 },
			{ page: 2 },
			{ isEllipsis: true },
			{ page: 8 },
			{ page: 9 },
			{ page: 10, isCurrent: true },
			{ page: 11 },
			{ page: 12 },
			{ isEllipsis: true },
			{ page: 19 },
			{ page: 20 },
		]);

		expect(createPaginationLinks(20, 20)).toEqual([
			{ page: 1 },
			{ page: 2 },
			{ isEllipsis: true },
			{ page: 18 },
			{ page: 19 },
			{ page: 20, isCurrent: true },
		]);
	});

});
