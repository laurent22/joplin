import { SubPath, Route } from '../../utils/routeUtils';
import { AppContext } from '../../utils/types';
import { contextSessionId } from '../../utils/requestUtils';
import { ErrorMethodNotAllowed } from '../../utils/errors';

const route: Route = {

	exec: async function(_path: SubPath, ctx: AppContext) {
		const sessionId = contextSessionId(ctx);

		if (ctx.method === 'GET') {
			return `HOME ${sessionId}`;
		}

		throw new ErrorMethodNotAllowed();
	},

};

export default route;
