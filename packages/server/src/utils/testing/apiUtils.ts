import { AppContext } from '../types';
import routeHandler from '../../middleware/routeHandler';
import { AppContextTestOptions, checkContextError, koaAppContext } from './testUtils';

interface ExecRequestOptions {
	filePath?: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	query?: Record<string, any>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export async function putApiC(sessionId: string, path: string, body: Record<string, any> = null, options: ExecRequestOptions = null): Promise<AppContext> {
	return execApiC(sessionId, 'PUT', path, body, options);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export async function putApi<T>(sessionId: string, path: string, body: Record<string, any> = null, options: ExecRequestOptions = null): Promise<T> {
	return execApi<T>(sessionId, 'PUT', path, body, options);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export async function patchApiC(sessionId: string, path: string, body: Record<string, any> = null, options: ExecRequestOptions = null): Promise<AppContext> {
	return execApiC(sessionId, 'PATCH', path, body, options);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export async function patchApi<T>(sessionId: string, path: string, body: Record<string, any> = null, options: ExecRequestOptions = null): Promise<T> {
	return execApi<T>(sessionId, 'PATCH', path, body, options);
}

export async function getApiC(sessionId: string, path: string, options: ExecRequestOptions = null): Promise<AppContext> {
	return execApiC(sessionId, 'GET', path, null, options);
}

export async function getApi<T>(sessionId: string, path: string, options: ExecRequestOptions = null): Promise<T> {
	return execApi<T>(sessionId, 'GET', path, null, options);
}

export async function deleteApiC(sessionId: string, path: string, options: ExecRequestOptions = null): Promise<AppContext> {
	return execApiC(sessionId, 'DELETE', path, null, options);
}

export async function deleteApi<T>(sessionId: string, path: string, options: ExecRequestOptions = null): Promise<T> {
	return execApi<T>(sessionId, 'DELETE', path, null, options);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export async function postApiC(sessionId: string, path: string, body: Record<string, any> = null, options: ExecRequestOptions = null): Promise<AppContext> {
	return execApiC(sessionId, 'POST', path, body, options);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export async function postApi<T>(sessionId: string, path: string, body: Record<string, any> = null, options: ExecRequestOptions = null): Promise<T> {
	return execApi<T>(sessionId, 'POST', path, body, options);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export async function execRequestC(sessionId: string, method: string, path: string, body: Record<string, any> = null, options: ExecRequestOptions = null): Promise<AppContext> {
	options = options || {};

	const appContextOptions: AppContextTestOptions = {
		sessionId,
		request: {
			method,
			url: `/${path}`,
		},
	};

	if (body) appContextOptions.request.body = body;

	if (options.filePath) appContextOptions.request.files = { file: { filepath: options.filePath } };
	if (options.query) appContextOptions.request.query = options.query;

	const context = await koaAppContext(appContextOptions);
	await routeHandler(context);
	return context;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export async function execRequest<T>(sessionId: string, method: string, url: string, body: Record<string, any> = null, options: ExecRequestOptions = null): Promise<T> {
	const context = await execRequestC(sessionId, method, url, body, options);
	await checkContextError(context);
	return context.response.body as T;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export async function execApiC(sessionId: string, method: string, path: string, body: Record<string, any> = null, options: ExecRequestOptions = null): Promise<AppContext> {
	return execRequestC(sessionId, method, `api/${path}`, body, options);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export async function execApi<T>(sessionId: string, method: string, url: string, body: Record<string, any> = null, options: ExecRequestOptions = null): Promise<T> {
	const context = await execApiC(sessionId, method, url, body, options);
	await checkContextError(context);
	return context.response.body as T;
}
