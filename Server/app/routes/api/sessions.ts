import * as Koa from 'koa';
import * as parse from 'co-body';
import SessionController from '../../controllers/SessionController';
import { SubPath, Route } from '../../utils/routeUtils';
import { ErrorNotFound } from '../../utils/errors';

const route:Route = {

	exec: async function(path:SubPath, ctx:Koa.Context) {
		if (!path.link) {
			if (ctx.method === 'POST') {
				const user = await parse.json(ctx);
				const sessionController = new SessionController();
				const session = await sessionController.authenticate(user.email, user.password);
				return { id: session.id };
			}
		}

		throw new ErrorNotFound(`Invalid link: ${path.link}`);
	},

};

export default route;
