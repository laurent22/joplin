require('app-module-path').addPath(__dirname + '/..');

import * as Koa from 'koa';
import sessionRoute from './routes/sessions';
import pingRoute from './routes/ping';
import { ErrorNotFound } from './utils/errors';
import * as fs from 'fs-extra';
import { argv } from 'yargs';

const port = 3222;

console.info('Starting server on port ' + port + ' and PID ' + process.pid + '...');

const app = new Koa();

interface Routes {
	[key: string]: Function,
}

const routes:Routes = {
	'ping': pingRoute,
	'sessions': sessionRoute,
};

app.use(async (ctx:Koa.Context) => {
	const splittedPath = ctx.path.split('/');
	const basePath = splittedPath[1];
	splittedPath.splice(0, 2);
	const subPath = '/' + splittedPath.join('/');

	try {
		if (routes[basePath]) {
			const responseObject = await routes[basePath](subPath, ctx);
			ctx.response.status = 200;
			ctx.response.body = responseObject;
		} else {
			throw new ErrorNotFound();
		}
	} catch (error) {
		ctx.response.status = error.httpCode ? error.httpCode : 500;
		ctx.response.body = { error: error.message };
	}
});

const pidFile = argv.pidfile as string;
if (pidFile) {
	console.info('Writing PID to ' + pidFile + '...');
	fs.removeSync(pidFile as string);
	fs.writeFileSync(pidFile, '' + process.pid);
}

app.listen(port);
