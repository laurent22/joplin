import { SubPath, Route, redirect } from '../../utils/routeUtils';
import { ErrorMethodNotAllowed } from '../../utils/errors';
import { AppContext } from '../../utils/types';
import { formParse } from '../../utils/requestUtils';
import { baseUrl } from '../../config';

const route: Route = {

	exec: async function(_path: SubPath, ctx: AppContext) {
		const loginController = ctx.controllers.indexLogin();

		if (ctx.method === 'GET') {
			return loginController.getIndex();
		}

		if (ctx.method === 'POST') {
			try {
				const body = await formParse(ctx.req);

				const session = await ctx.models.session().authenticate(body.fields.email, body.fields.password);
				ctx.cookies.set('sessionId', session.id);
				return redirect(ctx, `${baseUrl()}/home`);
			} catch (error) {
				return loginController.getIndex(error);
			}
		}

		throw new ErrorMethodNotAllowed();
	},

};

export default route;
