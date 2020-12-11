import { SubPath, Route } from '../../utils/routeUtils';
import { AppContext } from '../../utils/types';
import { contextSessionId } from '../../utils/requestUtils';
import { ErrorMethodNotAllowed } from '../../utils/errors';

const route: Route = {

	exec: async function(_path: SubPath, ctx: AppContext) {
		const sessionId = contextSessionId(ctx);
		const homeController = ctx.controllers.indexHome();

		if (ctx.method === 'GET') {
			return homeController.getIndex(sessionId);
		}

		throw new ErrorMethodNotAllowed();
	},

};

export default route;
