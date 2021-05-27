import { routeResponseFormat, Response, RouteResponseFormat, execRequest } from '../utils/routeUtils';
import { AppContext, Env } from '../utils/types';
import { isView, View } from '../services/MustacheService';

export default async function(ctx: AppContext) {
	ctx.appLogger().info(`${ctx.request.method} ${ctx.path}`);

	try {
		const responseObject = await execRequest(ctx.routes, ctx);

		if (responseObject instanceof Response) {
			ctx.response = responseObject.response;
		} else if (isView(responseObject)) {
			ctx.response.status = 200;
			ctx.response.body = await ctx.services.mustache.renderView(responseObject, {
				notifications: ctx.notifications || [],
				hasNotifications: !!ctx.notifications && !!ctx.notifications.length,
				owner: ctx.owner,
			});
		} else {
			ctx.response.status = 200;
			ctx.response.body = [undefined, null].includes(responseObject) ? '' : responseObject;
		}
	} catch (error) {
		if (error.httpCode >= 400 && error.httpCode < 500) {
			ctx.appLogger().error(`${error.httpCode}: ` + `${ctx.request.method} ${ctx.path}` + ` : ${error.message}`);
		} else {
			ctx.appLogger().error(error);
		}

		// Uncomment this when getting HTML blobs as errors while running tests.
		// console.error(error);

		ctx.response.status = error.httpCode ? error.httpCode : 500;

		const responseFormat = routeResponseFormat(ctx);

		if (error.code === 'invalidOrigin') {
			ctx.response.body = error.message;
		} else if (responseFormat === RouteResponseFormat.Html) {
			ctx.response.set('Content-Type', 'text/html');
			const view: View = {
				name: 'error',
				path: 'index/error',
				content: {
					error,
					stack: ctx.env === Env.Dev ? error.stack : '',
					owner: ctx.owner,
				},
			};
			ctx.response.body = await ctx.services.mustache.renderView(view);
		} else { // JSON
			ctx.response.set('Content-Type', 'application/json');
			const r: any = { error: error.message };
			if (ctx.env === Env.Dev && error.stack) r.stack = error.stack;
			if (error.code) r.code = error.code;
			ctx.response.body = r;
		}
	}
}
