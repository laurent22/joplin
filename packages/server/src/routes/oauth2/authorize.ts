// import { ErrorMethodNotAllowed } from '../../utils/errors';
// import { SubPath, Route } from '../../utils/routeUtils';
// import { AppContext } from '../../utils/types';

// const route: Route = {

// 	exec: async function(_: SubPath, ctx: AppContext) {

// 		const controller = ctx.controllers.oauth();

// 		if (ctx.method === 'GET') {
// 			return controller.getAuthorize(ctx.request.query);
// 		}

// 		if (ctx.method === 'POST') {
// 			return controller.postAuthorize(ctx.request.body);
// 		}

// 		throw new ErrorMethodNotAllowed();
// 	},

// 	needsBodyMiddleware: true,
// 	// responseFormat: 'html',

// };

// export default route;
