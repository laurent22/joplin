import JoplinServerApi, { ExecOptions } from './JoplinServerApi';
import Setting from './models/Setting';
import { AppType } from './models/settings/types';
import shim from './shim';

const makeApi = () => {
	return new JoplinServerApi({
		baseUrl: () => 'https://example.com',
		userContentBaseUrl: () => '',
		username: () => 'user',
		password: () => 'password',
		apiKey: () => '',
		session: () => ({ id: 'session-id', user_id: 'user-id' }),
	});
};

const mockRequestFunction = (name: 'fetch' | 'fetchBlob' | 'uploadBlob') => {
	const requestHeaders: Record<string, string>[] = [];
	jest.spyOn(shim, name).mockImplementation(async (_url: string, options?: { headers?: Record<string, string> }) => {
		requestHeaders.push(options.headers);
		return { ok: true, status: 200, text: async () => '{}' };
	});
	return requestHeaders;
};

describe('JoplinServerApi', () => {

	beforeEach(() => {
		jest.spyOn(shim, 'appVersion').mockReturnValue('3.5.1');
	});

	afterEach(() => {
		jest.restoreAllMocks();
		Setting.setConstant('appType', AppType.Cli);
	});

	test.each([
		['fetch', 'GET', {}],
		['fetchBlob', 'GET', { target: 'file', path: 'downloaded-file' }],
		['uploadBlob', 'PUT', { source: 'file', path: 'uploaded-file' }],
	] as const)('should send a Joplin User-Agent header with shim.%s', async (requestFunctionName, method, options) => {
		jest.spyOn(shim, 'platformName').mockReturnValue('linux');
		const requestHeaders = mockRequestFunction(requestFunctionName);

		await makeApi().exec(method, 'api/items/root:/test.md:/content', null, null, null, options as ExecOptions);

		expect(requestHeaders.length).toBe(1);
		expect(requestHeaders[0]['User-Agent']).toBe('Joplin/3.5.1 (CLI; Linux)');
	});

	test.each([
		['Joplin/3.5.1 (Desktop; macOS)', AppType.Desktop, 'darwin'],
		['Joplin/3.5.1 (Mobile; Android)', AppType.Mobile, 'android'],
	] as const)('should identify the app as %s', async (expectedUserAgent, appType, platformName) => {
		Setting.setConstant('appType', appType);
		jest.spyOn(shim, 'platformName').mockReturnValue(platformName);
		const requestHeaders = mockRequestFunction('fetch');

		await makeApi().exec('GET', 'api/items');

		expect(requestHeaders[0]['User-Agent']).toBe(expectedUserAgent);
	});

});
