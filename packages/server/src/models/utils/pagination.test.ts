import { expectHttpError, expectThrow } from '../../utils/testing/testUtils';
import { defaultPagination, Pagination, createPaginationLinks, requestPagination, PaginationOrderDir } from './pagination';
import { ErrorBadRequest } from '../../utils/errors';
import { encodeBase64 } from '../../utils/base64';

describe('pagination', () => {

	test('should create options from request query parameters', async () => {
		const d = defaultPagination();

		const testCases: [Record<string, unknown> | null, Pagination][] = [
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
						dir: PaginationOrderDir.ASC,
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
			const input = t[0];
			const expected: Pagination = t[1];
			const actual: Pagination = requestPagination(input as Parameters<typeof requestPagination>[0]);

			expect(actual).toEqual(expected);
		}

		await expectThrow(async () => requestPagination({ order_dir: 'ASC' }));
		await expectThrow(async () => requestPagination({ order_dir: 'DESC' }));
		await expectThrow(async () => requestPagination({ page: 0 }));
	});

	test.each([
		'title; DROP TABLE items',
		'items.title',
		'1',
		'',
		'title ASC',
		'count(*)',
	])('should reject an order_by that is not a column name: %s', async (orderBy) => {
		// The field ends up as a column name in the query, so anything that
		// could not be one must be reported as a bad request rather than
		// reaching the database.
		await expectHttpError(async () => requestPagination({ order_by: orderBy }), ErrorBadRequest.httpCode);
	});

	test.each([
		['not base64 at all', 'Invalid cursor'],
		[encodeBase64('{ not json'), 'Invalid cursor'],
		[encodeBase64(JSON.stringify({ limit: -1, page: 1, order: [] })), 'Limit out of bond: -1'],
		[encodeBase64(JSON.stringify({ limit: 10, page: 1, order: [{ by: 'title; DROP TABLE items', dir: 'asc' }] })), 'Invalid order_by'],
		[encodeBase64(JSON.stringify({ limit: 10, page: 1 })), 'Invalid order parameter'],
	])('should reject a malformed cursor: %s', async (cursor) => {
		// The cursor is supplied by the client, so it cannot be trusted just
		// because the server issued one earlier.
		await expectHttpError(async () => requestPagination({ cursor }), ErrorBadRequest.httpCode);
	});

	test('should accept a cursor the server issued', async () => {
		const cursor = encodeBase64(JSON.stringify(defaultPagination()));
		const p = requestPagination({ cursor });
		expect(p.page).toBe(defaultPagination().page + 1);
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
