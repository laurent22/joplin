import WebDavApi from './WebDavApi';
import shim, { FetchOptions } from './shim';

const makeApi = () => {
	return new WebDavApi({
		baseUrl: () => 'https://example.com/dav',
		username: () => 'user',
		password: () => 'password',
	});
};

const makeResponse = (status: number, text = '') => {
	return {
		ok: status >= 200 && status < 300,
		status,
		text: async () => text,
	};
};

describe('WebDavApi', () => {

	let originalFetch: typeof shim.fetch;

	beforeEach(() => {
		originalFetch = shim.fetch;
	});

	afterEach(() => {
		shim.fetch = originalFetch;
	});

	test.each([
		['MKCOL', true],
		['PUT', false],
	])('should only treat a 405 as an If-None-Match rejection for non-MKCOL requests (%s)', async (method, shouldKeepHeader) => {
		const requests: Record<string, string | number>[] = [];
		shim.fetch = (async (_url: string, options: FetchOptions) => {
			requests.push(options.headers as Record<string, string | number>);
			// The server always rejects with 405, whether or not the header is present
			return makeResponse(405);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- test double only implements the subset of shim.fetch used here
		}) as any;

		const api = makeApi();

		await expect(api.exec(method, 'dir/')).rejects.toThrow();

		// A 405 on MKCOL means the collection already exists, so no retry should happen
		expect(requests.length).toBe(shouldKeepHeader ? 1 : 2);

		// Either way the header must be kept: the 405 was not caused by it, since it was
		// also returned when the retry omitted the header
		requests.length = 0;
		await expect(api.exec('PROPFIND', 'dir/')).rejects.toThrow();
		expect('If-None-Match' in requests[0]).toBe(true);
	});

	test('should keep sending If-None-Match when a retry without it fails too', async () => {
		const requests: Record<string, string | number>[] = [];
		shim.fetch = (async (_url: string, options: FetchOptions) => {
			const headers = options.headers as Record<string, string | number>;
			requests.push(headers);
			// The header is not the cause of the failure - the server rejects either way
			return makeResponse('If-None-Match' in headers ? 400 : 500);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- test double only implements the subset of shim.fetch used here
		}) as any;

		const api = makeApi();

		await expect(api.exec('PUT', 'test.md', 'content')).rejects.toThrow();
		expect(requests.length).toBe(2);

		// The headerless retry failed with a non-terminal error, so nothing was learned about
		// the server and the detection is run again, starting with the header
		requests.length = 0;
		await expect(api.exec('PUT', 'test2.md', 'content')).rejects.toThrow();
		expect('If-None-Match' in requests[0]).toBe(true);
	});

	test('should stop sending If-None-Match when the server rejects it with a 400', async () => {
		const requests: Record<string, string | number>[] = [];
		shim.fetch = (async (_url: string, options: FetchOptions) => {
			const headers = options.headers as Record<string, string | number>;
			requests.push(headers);
			if ('If-None-Match' in headers) return makeResponse(400);
			return makeResponse(200, '');
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- test double only implements the subset of shim.fetch used here
		}) as any;

		const api = makeApi();

		await api.exec('PUT', 'test.md', 'content');
		expect(requests.length).toBe(2);

		requests.length = 0;
		await api.exec('PUT', 'test2.md', 'content');
		expect(requests.length).toBe(1);
		expect('If-None-Match' in requests[0]).toBe(false);
	});

});
