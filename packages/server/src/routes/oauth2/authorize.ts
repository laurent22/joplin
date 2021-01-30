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





// ORIGINAL CONTROLLER:


// import BaseController from '../BaseController';
// import mustacheService from '../../services/MustacheService';
// import { ErrorNotFound } from '../../utils/errors';
// import uuidgen from '../../utils/uuidgen';
// import controllers from '../factory';

// export default class OAuthController extends BaseController {

// 	async getAuthorize(query: any): Promise<string> {
// 		const clientModel = this.models.apiClient();
// 		const client = await clientModel.load(query.client_id);
// 		if (!client) throw new ErrorNotFound(`client_id missing or invalid client ID: ${query.client_id}`);

// 		return mustacheService.render('oauth2/authorize', {
// 			response_type: query.response_type,
// 			client: client,
// 		}, {
// 			cssFiles: ['oauth2/authorize'],
// 		});
// 	}

// 	async postAuthorize(query: any): Promise<string> {
// 		const clientModel = this.models.apiClient();
// 		const sessionModel = this.models.session();
// 		const sessionController = controllers(this.models).session();

// 		let client = null;

// 		try {
// 			client = await clientModel.load(query.client_id);
// 			if (!client) throw new ErrorNotFound(`client_id missing or invalid client ID: ${query.client_id}`);

// 			const session = await sessionController.authenticate(query.email, query.password);
// 			const authCode = uuidgen(32);
// 			await sessionModel.save({ id: session.id, auth_code: authCode });

// 			return mustacheService.render('oauth2/authcode', {
// 				client: client,
// 				authCode: authCode,
// 			}, {
// 				cssFiles: ['oauth2/authorize'],
// 			});
// 		} catch (error) {
// 			return mustacheService.render('oauth2/authorize', {
// 				response_type: query.response_type,
// 				client: client,
// 				error: error,
// 			}, {
// 				cssFiles: ['oauth2/authorize'],
// 			});
// 		}
// 	}

// }
