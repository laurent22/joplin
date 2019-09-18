import * as Koa from 'koa';
import * as parse from 'co-body';
import SessionController from '../controllers/SessionController';

export default async function(path:string, ctx:Koa.Context) {
	const user = await parse.json(ctx);
	const sessionController = new SessionController();
	const session = await sessionController.authenticate(user.email, user.password);
	ctx.response.body = { id: session.id };
}
