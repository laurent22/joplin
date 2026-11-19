import { RequestMethod, Request } from '../Api';
import requestPaginationOptions from './requestPaginationOptions';

const mockRequest = (request: Partial<Request>): Request => ({
	method: RequestMethod.GET,
	path: '/test',
	body: '',
	bodyJson_: null,
	bodyJson: {},
	files: [],
	params: [],
	...request,

	query: request.query ?? {},
});

describe('requestPaginationOptions', () => {
	it.each([
		{ limit: 'test', shouldThrow: true },
		{ limit: 1.1, shouldThrow: true },
		{ limit: 0, shouldThrow: false },
		{ limit: 64, shouldThrow: false },
	])('should require integer limits: %j', ({ limit, shouldThrow }) => {
		try {
			requestPaginationOptions(mockRequest({
				query: {
					limit: limit as number,
				},
			}));
		} catch (error) {
			if (shouldThrow) {
				expect(error.httpCode).toBe(400);
			} else {
				throw error;
			}
		}
	});

	it.each([
		{ field: 'valid', allow: true },
		{ field: 'also_valid', allow: true },
		{ field: 'not valid', allow: false },
		{ field: '`', allow: false },
		{ field: '', allow: false },
	])('should disallow invalid order_by fields: %j', ({ field, allow }) => {
		try {
			requestPaginationOptions(mockRequest({
				query: {
					order_by: field,
				},
			}));
		} catch (error) {
			if (allow) {
				throw error;
			} else {
				expect(error.httpCode).toBe(400);
			}
		}
	});

	it('should disallow non-integer pages', () => {
		expect(() => (
			requestPaginationOptions(
				mockRequest({ query: { page: 4.1 } }),
			)
		)).toThrow();
	});
});
