require('app-module-path').addPath(`${__dirname}/..`);

import * as Koa from 'koa';
import apiSessionsRoute from './routes/api/sessions';
import apiPingRoute from './routes/api/ping';
import apiFilesRoute from './routes/api/files';
import { ErrorNotFound } from './utils/errors';
import * as fs from 'fs-extra';
import * as koaBody from 'koa-body';
import { argv } from 'yargs';

const port = 3222;

console.info(`Starting server on port ${port} and PID ${process.pid}...`);

const app = new Koa();

interface Routes {
	[key: string]: Function,
}

interface MatchedRoute {
	route: Function,
	basePath: string,
	subPath: string,
}

// TODO: the routes should be an object with { exec: () => {} }
//       + additional properties to tell what the route needs.
//       For example `needBodyMiddleware` for api/files
const routes:Routes = {
	'api/ping': apiPingRoute,
	'api/sessions': apiSessionsRoute,
	'api/files': apiFilesRoute,
};

function findMatchingRoute(path:string, routes:Routes):MatchedRoute {
	let splittedPath = path.split('/');
	splittedPath.splice(0, 1);

	if (splittedPath.length >= 2) {
		const basePath = `${splittedPath[0]}/${splittedPath[1]}`;
		if (routes[basePath]) {
			splittedPath.splice(0, 2);
			return {
				route: routes[basePath],
				basePath: basePath,
				subPath: `/${splittedPath.join('/')}`,
			};
		}
	}

	const basePath = splittedPath[0];
	if (routes[basePath]) {
		splittedPath.splice(0, 1);
		return {
			route: routes[basePath],
			basePath: basePath,
			subPath: `/${splittedPath.join('/')}`,
		};
	}

	return null;
}

function koaIf(middleware:Function, condition:any=null) {
	return async (ctx:Koa.Context, next:Function) => {
		if (typeof condition === 'function' && condition(ctx)) {
			await middleware(ctx, next);
		} else if (typeof condition === 'boolean' && condition) {
			await middleware(ctx, next);
		} else {
			await next();
		}
	};
}

const koaBodyMiddleware = koaBody({
	multipart: true,
	includeUnparsed: true,
});

app.use(koaIf(koaBodyMiddleware, (ctx:Koa.Context) => {
	return ctx.path.indexOf('/api/files') === 0;
}));

app.use(async (ctx:Koa.Context) => {
	const match = findMatchingRoute(ctx.path, routes);

	try {
		if (match) {
			const responseObject = await match.route(match.subPath, ctx);
			ctx.response.status = 200;
			ctx.response.body = responseObject;
		} else {
			throw new ErrorNotFound();
		}
	} catch (error) {
		console.error(error);
		ctx.response.status = error.httpCode ? error.httpCode : 500;
		ctx.response.body = { error: error.message };
	}
});

const pidFile = argv.pidfile as string;
if (pidFile) {
	console.info(`Writing PID to ${pidFile}...`);
	fs.removeSync(pidFile as string);
	fs.writeFileSync(pidFile, `${process.pid}`);
}

app.listen(port);
