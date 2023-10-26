

import shim from '../shim';

export enum HttpMethod {
	Post = 'POST',
	Get = 'GET',
	// There exist other methods. Add more as necessary.
	// See https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods

	// For all methods
	Any = 'any',
}

export type OnRequestCallback = (
	urlMatch: RegExpMatchArray, body: string, headers: Record<string, string>
)=> Promise<Response>;

export interface NetworkRequestControl {
	reset(): void;
	mockRequest(
		urlPattern: RegExp,
		method: HttpMethod,
		createResponse: OnRequestCallback,
	): void;
}

interface PathMockRecord {
	urlPattern: RegExp;
	method: HttpMethod;
	handler: OnRequestCallback;
}

// Mocks the network-related functions in shim
const mockNetworkRequests = (): NetworkRequestControl => {
	const requestMocks: PathMockRecord[] = [];

	shim.fetch = (url: string, options = {}) => {
		options = {
			method: 'GET',
			headers: {},
			body: '',
			...options,
		};

		let match: RegExpMatchArray|null = null;
		let handlingMock: PathMockRecord|null = null;
		for (const mock of requestMocks) {
			const urlMatch = url.match(mock.urlPattern);

			if (urlMatch) {
				match = urlMatch;
				handlingMock = mock;
				break;
			}
		}

		if (match === null || handlingMock === null) {
			console.warn('Request for unhandled URL', url);
			return new Response('No handler registered', { status: 404 });
		} else {
			return handlingMock.handler(match, options.body, options.headers);
		}
	};

	shim.fetchBlob = () => {
		throw new Error('Not implemented');
	};

	return {
		reset() {
			while (requestMocks.length > 0) {
				requestMocks.pop();
			}
		},

		mockRequest(urlPattern: RegExp, method: HttpMethod, createResponse: OnRequestCallback) {
			requestMocks.push({
				urlPattern, method, handler: createResponse,
			});
		},
	};
};

export default mockNetworkRequests;
