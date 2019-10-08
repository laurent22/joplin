import * as Koa from 'koa';
import { ErrorMethodNotAllowed } from '../../utils/errors';
import { SubPath, Route } from '../../utils/routeUtils';
import OAuthController from '../../controllers/OAuthController';

const route:Route = {

	exec: async function(_:SubPath, ctx:Koa.Context) {

		const controller = new OAuthController();

		if (ctx.method === 'GET') {
			return controller.getAuthorize(ctx.request.query);
		}

		if (ctx.method === 'POST') {
			return controller.postAuthorize(ctx.request.body);
		}

		throw new ErrorMethodNotAllowed();
	},

	needsBodyMiddleware: true,
	responseFormat: 'html',

};

export default route;
