import { bodyFields } from '../../utils/requestUtils';
import { SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { HttpMethod, RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import routeHandler from '../../middleware/routeHandler';
import config from '../../config';
import { ErrorBadRequest } from '../../utils/errors';

const router = new Router(RouteType.Api);

const maxSubRequests = 50;

interface SubRequest {
	method: HttpMethod;
	url: string;
	headers: Record<string, string>;
	body: any;
}

type SubRequests = Record<string, SubRequest>;

interface SubRequestResponse {
	status: number;
	body: any;
	header: Record<string, any>;
}

type BatchResponse = Record<string, SubRequestResponse>;

function createSubRequestContext(ctx: AppContext, subRequest: SubRequest): AppContext {
	const fullUrl = `${config().apiBaseUrl}/${subRequest.url.trim()}`;

	const newContext: AppContext = {
		...ctx,
		URL: new URL(fullUrl),
		request: {
			...ctx.request,
			method: subRequest.method,
		},
		method: subRequest.method,
		headers: {
			...ctx.headers,
			...subRequest.headers,
		},
		body: subRequest.body,
		joplin: {
			...ctx.joplin,
			appLogger: ctx.joplin.appLogger,
			services: ctx.joplin.services,
			db: ctx.joplin.db,
			models: ctx.joplin.models,
			routes: ctx.joplin.routes,
		},
		path: `/${subRequest.url}`,
		url: fullUrl,
	};

	return newContext;
}

function validateRequest(request: SubRequest): SubRequest {
	const output = { ...request };
	if (!output.method) output.method = HttpMethod.GET;
	if (!output.url) throw new Error('"url" is required');
	return output;
}

router.post('api/batch', async (_path: SubPath, ctx: AppContext) => {
	throw new Error('Not enabled');

	// eslint-disable-next-line no-unreachable
	const subRequests = await bodyFields<SubRequests>(ctx.req);

	if (Object.keys(subRequests).length > maxSubRequests) throw new ErrorBadRequest(`Can only process up to ${maxSubRequests} requests`);

	const response: BatchResponse = {};

	for (const subRequestId of Object.keys(subRequests)) {
		const subRequest = validateRequest(subRequests[subRequestId]);
		const subRequestContext = createSubRequestContext(ctx, subRequest);
		await routeHandler(subRequestContext);
		const r = subRequestContext.response;

		response[subRequestId] = {
			status: r.status,
			body: typeof r.body === 'object' ? { ...(r.body as object) } : r.body,
			header: r.header ? { ...r.header } : {},
		};
	}

	return response;
});

export default router;
