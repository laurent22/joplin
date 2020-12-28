import { SubPath, Route } from '../../utils/routeUtils';
import { ErrorNotFound } from '../../utils/errors';
import { AppContext } from '../../utils/types';
import { bodyFields } from '../../utils/requestUtils';

const route: Route = {

	exec: async function(path: SubPath, ctx: AppContext) {
		if (!path.link) {
			if (ctx.method === 'POST') {
				const user =  await bodyFields(ctx.req);
				const sessionController = ctx.controllers.apiSession();
				const session = await sessionController.authenticate(user.email, user.password);
				return { id: session.id };
			}
		}

		throw new ErrorNotFound(`Invalid link: ${path.link}`);
	},

};

export default route;
