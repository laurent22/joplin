require('app-module-path').addPath(__dirname + '/..');

import * as Koa from 'koa';
import sessionRoute from './routes/sessions';
import { ErrorNotFound } from './utils/errors';

const app = new Koa();

interface Routes {
	[key: string]: Function,
}

const routes:Routes = {
	'sessions': sessionRoute,
};

app.use(async (ctx:Koa.Context) => {
	const splittedPath = ctx.path.split('/');
	const basePath = splittedPath[1];
	splittedPath.splice(0, 2);
	const subPath = '/' + splittedPath.join('/');

	try {
		if (routes[basePath]) {
			await routes[basePath](subPath, ctx);
		} else {
			throw new ErrorNotFound();
		}
	} catch (error) {
		ctx.response.status = error.httpCode ? error.httpCode : 500;
		ctx.response.body = { error: error.message };
	}
});

app.listen(3000);
