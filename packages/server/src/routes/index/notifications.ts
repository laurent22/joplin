import { SubPath, Route } from '../../utils/routeUtils';
import { AppContext } from '../../utils/types';
import { bodyFields, contextSessionId } from '../../utils/requestUtils';
import { ErrorMethodNotAllowed } from '../../utils/errors';

const route: Route = {

	exec: async function(path: SubPath, ctx: AppContext) {
		const sessionId = contextSessionId(ctx);

		if (path.id && ctx.method === 'PATCH') {
			return ctx.controllers.indexNotifications().patchOne(sessionId, path.id, await bodyFields(ctx.req));
		}

		throw new ErrorMethodNotAllowed();
	},

};

export default route;
