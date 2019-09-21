import * as Koa from 'koa';
import * as parse from 'co-body';
import SessionController from '../../controllers/SessionController';
import { SubPath } from '../../utils/routeUtils';

export default async function(path:SubPath, ctx:Koa.Context) {
	const user = await parse.json(ctx);
	const sessionController = new SessionController();
	const session = await sessionController.authenticate(user.email, user.password);
	return { id: session.id };
}
