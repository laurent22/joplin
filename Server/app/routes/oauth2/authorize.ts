import * as Koa from 'koa';
import { ErrorMethodNotAllowed } from '../../utils/errors';
import { SubPath, Route } from '../../utils/routeUtils';
import mustacheService from '../../services/MustacheService';

const route:Route = {

	exec: async function(_:SubPath, ctx:Koa.Context) {

		if (ctx.method === 'GET') {
			return mustacheService.render('oauth2/authorize', null, {
				cssFiles: ['oauth2/authorize'],
			});
		}

		throw new ErrorMethodNotAllowed();
	},

	// needsBodyMiddleware: true,

};

export default route;
