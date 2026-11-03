import shim from '../../../shim';

type RequestBody = Record<string, unknown>;
type RequestHandler = (body: RequestBody)=> Response;

export interface MockServerRequest {
	path: string;
	body: RequestBody;
}

export const jsonResponse = (json: unknown, status = 200) => {
	return new Response(JSON.stringify(json), { status });
};

const mockOpenAiServer = (baseUrl: string, handlers: Record<string, RequestHandler>) => {
	const requests: MockServerRequest[] = [];
	jest.spyOn(shim, 'fetch').mockImplementation(async (url, options) => {
		const path = url.substring(baseUrl.length);
		const body: RequestBody = JSON.parse(options.body);
		requests.push({ path, body });
		const handler = handlers[path];
		return handler ? handler(body) : new Response('404 page not found', { status: 404 });
	});
	return requests;
};

export default mockOpenAiServer;
