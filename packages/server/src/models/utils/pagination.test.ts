import { expectThrow } from '../../utils/testUtils';
import { defaultPagination, Pagination, requestPagination } from './pagination';

describe('pagination', function() {

	test('should create options from request query parameters', async function() {
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

});
