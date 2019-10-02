import * as Koa from 'koa';
import { ErrorMethodNotAllowed } from '../../utils/errors';
import { SubPath, Route } from '../../utils/routeUtils';
import mustacheRender from '../../utils/mustacheRender';

const route:Route = {

	exec: async function(_:SubPath, ctx:Koa.Context) {

		if (ctx.method === 'GET') {
			return mustacheRender('oauth2/authorize', { hello: 'salut' });
		}

		throw new ErrorMethodNotAllowed();
	},

	// needsBodyMiddleware: true,

};

export default route;
