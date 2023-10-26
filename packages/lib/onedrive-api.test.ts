import OneDriveApi from './onedrive-api';
import mockNetworkRequests, { HttpMethod } from './testing/mockNetworkRequests';

const networkRequestMock = mockNetworkRequests();

const makeOneDriveApi = () => {
	return new OneDriveApi(
		'test-client',
		'fake secret',
		true,
	);
};

describe('onedrive-api', () => {
	beforeEach(() => {
		networkRequestMock.reset();
	});

	test('should wait to retry on activityLimitReached error', async () => {
		const graphUrlPattern = /^https:\/\/graph.microsoft.com\/v1\.0\/([^/]+):\/(.*)$/;
		let lastPath: string|null = null;
		let timesCalled = 0;

		const acceptAfter = Date.now() + 2000;

		networkRequestMock.mockRequest(graphUrlPattern, HttpMethod.Get, async (urlMatch, _body, _headers) => {
			lastPath = urlMatch[1];
			timesCalled ++;

			if (acceptAfter && acceptAfter < Date.now()) {
				return new Response(JSON.stringify({
					someKey: 'Success!',
					note: 'This isn\'t what OneDrive would actually return in the case of success.',
				}), {
					status: 200,
					statusText: 'OK',
				});
			} else {
				const error = {
					code: 'activityLimitReached',
					message: 'Activity limit reached.',
				};
				const headers = {
					// Retry after 2 seconds
					'retry-after': '2',
				};

				return new Response(JSON.stringify({ error }), {
					headers: new Headers(headers),

					// "Too many requests"
					// See https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429
					status: 429,
				});
			}
		});

		const api = makeOneDriveApi();
		const response: Response = await api.exec('GET', 'info.json:/content', null, null, {});
		expect(timesCalled).toBe(2);
		expect(await response.text()).toContain('Success!');
		expect(lastPath).toBe('info.json');
	});
});
