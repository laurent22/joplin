import { routeResponseFormat, Response, RouteResponseFormat, execRequest } from '../utils/routeUtils';
import { AppContext, Env } from '../utils/types';
import { isView, View } from '../services/MustacheService';
import config from '../config';
import { userIp } from '../utils/requestUtils';
import { createCsrfTag } from '../utils/csrf';
import { getImpersonatorAdminSessionId } from '../routes/admin/utils/users/impersonate';
import { onRequestComplete, onRequestStart } from '../utils/metrics';
import { uuidgen } from '@joplin/lib/uuid';
import { ApiError, ErrorTooManyRequests } from '../utils/errors';
import { formatBytesSimple } from '../utils/bytes';

const logRequestInfo = (ctx: AppContext, requestStartTime: number, error: Error | string | null) => {
	try {
		const owner = ctx.joplin.owner;
		// Technically this is not the total request duration because there are
		// other middlewares but that should give a good approximation
		const requestDuration = Date.now() - requestStartTime;

		const getLinePrefix = () => {
			const prefix: string[] = [];
			if (owner) prefix.push(owner.id);
			prefix.push(userIp(ctx));
			if (typeof ctx.request?.length === 'number') prefix.push(formatBytesSimple(ctx.request.length));
			return prefix;
		};

		// If it's a successful request or a user error (error code < 500) we display the
		// information on a single line.
		const line = getLinePrefix();
		if (error && typeof error === 'string') line.push(error);
		line.push(`${ctx.request.method} ${ctx.path} (${ctx.response.status}) (${requestDuration}ms)`);
		ctx.joplin.appLogger().info(line.join(': '));

		// If we have an error object (should be a server error), we log the full stack trace.
		if (error && typeof error !== 'string' && error.message) {
			const line = getLinePrefix();
			ctx.joplin.appLogger().error(`${line.join(': ')}:`, error);
		}
	} catch (logFunctionError) {
		// eslint-disable-next-line no-console
		console.error('[ERROR] Error in logging function!!', logFunctionError);
	}
};

export default async function(ctx: AppContext) {
	const requestStartTime = Date.now();
	const requestId = uuidgen();

	onRequestStart(requestId);

	try {
		const { response: responseObject, path } = await execRequest(ctx.joplin.routes, ctx);

		if (responseObject instanceof Response) {
			ctx.response = responseObject.response;
		} else if (isView(responseObject)) {
			const impersonatorAdminSessionId = getImpersonatorAdminSessionId(ctx);

			const view = responseObject as View;
			ctx.response.status = view?.content?.error ? view?.content?.error?.httpCode || 500 : 200;
			ctx.response.body = await ctx.joplin.services.mustache.renderView(view, {
				currentPath: path,
				notifications: ctx.joplin.notifications || [],
				hasNotifications: !!ctx.joplin.notifications && !!ctx.joplin.notifications.length,
				owner: ctx.joplin.owner,
				supportEmail: config().supportEmail,
				impersonatorAdminSessionId,
				csrfTag: impersonatorAdminSessionId ? await createCsrfTag(ctx, false) : null,
			});
		} else {
			ctx.response.status = 200;
			ctx.response.body = [undefined, null].includes(responseObject) ? '' : responseObject;
		}

		logRequestInfo(ctx, requestStartTime, null);
	} catch (e) {
		const error = e as ApiError;

		// Uncomment this when getting HTML blobs as errors while running tests.
		// console.error(error);

		ctx.response.status = error.httpCode ? error.httpCode : 500;

		if (error.httpCode >= 400 && error.httpCode < 500) {
			logRequestInfo(ctx, requestStartTime, error.message);
		} else {
			logRequestInfo(ctx, requestStartTime, error);
		}

		const responseFormat = routeResponseFormat(ctx);

		if ((error as ErrorTooManyRequests).retryAfterMs) ctx.response.set('Retry-After', Math.ceil((error as ErrorTooManyRequests).retryAfterMs / 1000).toString());

		if (error.code === 'invalidOrigin') {
			ctx.response.body = error.message;
		} else if (responseFormat === RouteResponseFormat.Html) {
			ctx.response.set('Content-Type', 'text/html');
			const view: View = {
				name: 'error',
				path: 'index/error',
				content: {
					error,
					stack: config().showErrorStackTraces ? error.stack : '',
					owner: ctx.joplin.owner,
				},
				title: 'Error',
			};
			ctx.response.body = await ctx.joplin.services.mustache.renderView(view);
		} else { // JSON
			ctx.response.set('Content-Type', 'application/json');
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			const r: any = { error: error.message };
			if (ctx.joplin.env === Env.Dev && error.stack) r.stack = error.stack;
			if (error.code) r.code = error.code;
			ctx.response.body = r;
		}
	} finally {
		onRequestComplete(requestId);
	}
}
