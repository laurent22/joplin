import { SubPath, Route, redirect } from '../../utils/routeUtils';
import { ErrorMethodNotAllowed } from '../../utils/errors';
import { AppContext } from '../../utils/types';
import { baseUrl } from '../../config';

const route: Route = {

	exec: async function(_path: SubPath, ctx: AppContext) {
		if (ctx.method === 'POST') {
			// TODO: also delete the session from the database
			ctx.cookies.set('sessionId', '');
			return redirect(ctx, `${baseUrl()}/login`);
		}

		throw new ErrorMethodNotAllowed();
	},

};

export default route;
