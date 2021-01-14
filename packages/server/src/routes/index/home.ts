import { SubPath, Route } from '../../utils/routeUtils';
import { AppContext } from '../../utils/types';
import { contextSessionId } from '../../utils/requestUtils';
import { ErrorMethodNotAllowed } from '../../utils/errors';
import defaultView from '../../utils/defaultView';

const route: Route = {

	exec: async function(_path: SubPath, ctx: AppContext) {
		contextSessionId(ctx);

		if (ctx.method === 'GET') {
			return defaultView('home');
		}

		throw new ErrorMethodNotAllowed();
	},

};

export default route;
