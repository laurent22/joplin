import { SubPath, Route, redirect } from '../../utils/routeUtils';
import { ErrorMethodNotAllowed } from '../../utils/errors';
import { AppContext } from '../../utils/types';
import { baseUrl } from '../../config';
import { contextSessionId } from '../../utils/requestUtils';

const route: Route = {

	exec: async function(_path: SubPath, ctx: AppContext) {
		if (ctx.method === 'POST') {
			const sessionId = contextSessionId(ctx, false);
			ctx.cookies.set('sessionId', '');
			await ctx.models.session().logout(sessionId);
			return redirect(ctx, `${baseUrl()}/login`);
		}

		throw new ErrorMethodNotAllowed();
	},

};

export default route;
