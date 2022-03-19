import { routeResponseFormat, Response, RouteResponseFormat, execRequest } from '../utils/routeUtils';
import { AppContext, Env } from '../utils/types';
import { isView, View } from '../services/MustacheService';
import config from '../config';
import { userIp } from '../utils/requestUtils';
import { createCsrfTag } from '../utils/csrf';
import { getImpersonatorAdminSessionId } from '../routes/admin/utils/users/impersonate';

export default async function(ctx: AppContext) {
	const requestStartTime = Date.now();

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
	} catch (error) {
		if (error.httpCode >= 400 && error.httpCode < 500) {
			const owner = ctx.joplin.owner;

			const line: string[] = [
				error.httpCode,
				`${ctx.request.method} ${ctx.path}`,
				owner ? owner.id : userIp(ctx),
				error.message,
			];

			if (error.details) line.push(JSON.stringify(error.details));

			ctx.joplin.appLogger().error(line.join(': '));
		} else {
			ctx.joplin.appLogger().error(userIp(ctx), error);
		}

		// Uncomment this when getting HTML blobs as errors while running tests.
		// console.error(error);

		ctx.response.status = error.httpCode ? error.httpCode : 500;

		const responseFormat = routeResponseFormat(ctx);

		if (error.retryAfterMs) ctx.response.set('Retry-After', Math.ceil(error.retryAfterMs / 1000).toString());

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
			const r: any = { error: error.message };
			if (ctx.joplin.env === Env.Dev && error.stack) r.stack = error.stack;
			if (error.code) r.code = error.code;
			ctx.response.body = r;
		}
	} finally {
		// Technically this is not the total request duration because there are
		// other middlewares but that should give a good approximation
		const requestDuration = Date.now() - requestStartTime;
		ctx.joplin.appLogger().info(`${ctx.request.method} ${ctx.path} (${ctx.response.status}) (${requestDuration}ms)`);
	}
}
