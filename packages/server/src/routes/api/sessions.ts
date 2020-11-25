import * as parse from 'co-body';
import { SubPath, Route } from '../../utils/routeUtils';
import { ErrorNotFound } from '../../utils/errors';
import { AppContext } from '../../utils/types';

const route: Route = {

	exec: async function(path: SubPath, ctx: AppContext) {
		if (!path.link) {
			if (ctx.method === 'POST') {
				const user = await parse.json(ctx);
				const sessionController = ctx.controllers.session();
				const session = await sessionController.authenticate(user.email, user.password);
				return { id: session.id };
			}
		}

		throw new ErrorNotFound(`Invalid link: ${path.link}`);
	},

};

export default route;
