import * as Koa from 'koa';
import * as parse from 'co-body';
import SessionController from '../../controllers/SessionController';
import { SubPath, Route } from '../../utils/routeUtils';

const route:Route = {

	exec: async function(_:SubPath, ctx:Koa.Context) {
		const user = await parse.json(ctx);
		const sessionController = new SessionController();
		const session = await sessionController.authenticate(user.email, user.password);
		return { id: session.id };
	},

};

export default route;
