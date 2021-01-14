import { SubPath, Route, redirect } from '../../utils/routeUtils';
import { ErrorMethodNotAllowed } from '../../utils/errors';
import { AppContext } from '../../utils/types';
import { formParse } from '../../utils/requestUtils';
import { baseUrl } from '../../config';
import defaultView from '../../utils/defaultView';
import { View } from '../../services/MustacheService';

function makeView(error: any = null): View {
	const view = defaultView('login');
	view.content.error = error;
	view.partials = ['errorBanner'];
	return view;
}

const route: Route = {

	exec: async function(_path: SubPath, ctx: AppContext) {
		if (ctx.method === 'GET') {
			return makeView();
		}

		if (ctx.method === 'POST') {
			try {
				const body = await formParse(ctx.req);

				const session = await ctx.models.session().authenticate(body.fields.email, body.fields.password);
				ctx.cookies.set('sessionId', session.id);
				return redirect(ctx, `${baseUrl()}/home`);
			} catch (error) {
				return makeView(error);
			}
		}

		throw new ErrorMethodNotAllowed();
	},

};

export default route;
