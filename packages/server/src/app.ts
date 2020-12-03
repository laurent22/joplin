import * as Koa from 'koa';
import routes from './routes/routes';
import { ErrorNotFound } from './utils/errors';
import * as fs from 'fs-extra';
import * as koaBody from 'koa-body';
import { argv } from 'yargs';
import { findMatchingRoute, ApiResponse } from './utils/routeUtils';
import Logger, { LoggerWrapper, TargetType } from '@joplin/lib/Logger';
import koaIf from './utils/koaIf';
import config, { initConfig, baseUrl } from './config';
import configDev from './config-dev';
import configProd from './config-prod';
import { createDb, dropDb } from './tools/dbTools';
import { connectDb, disconnectDb, migrateDb, waitForConnection } from './db';
import modelFactory from './models/factory';
import controllerFactory from './controllers/factory';
import { AppContext } from './utils/types';
import FsDriverNode from '@joplin/lib/fs-driver-node';

let appLogger_: LoggerWrapper = null;

function appLogger(): LoggerWrapper {
	if (!appLogger_) appLogger_ = Logger.create('App');
	return appLogger_;
}

const app = new Koa();

const koaBodyMiddleware = koaBody({
	multipart: true,
	includeUnparsed: true,
	onError: (err: Error, ctx: Koa.Context) => {
		appLogger().error(`koaBodyMiddleware: ${ctx.method} ${ctx.path} Error: ${err.message}`);
	},
});

app.use(koaIf(koaBodyMiddleware, (ctx: Koa.Context) => {
	const match = findMatchingRoute(ctx.path, routes);
	if (!match) return false;
	return match.route.needsBodyMiddleware === true;
}));

app.use(async (ctx: Koa.Context) => {
	appLogger().info(`${ctx.request.method} ${ctx.path}`);

	const match = findMatchingRoute(ctx.path, routes);

	try {
		if (match) {
			const responseObject = await match.route.exec(match.subPath, ctx);

			if (responseObject instanceof ApiResponse) {
				ctx.response = responseObject.response;
			} else {
				ctx.response.status = 200;
				ctx.response.body = responseObject;
			}
		} else {
			throw new ErrorNotFound();
		}
	} catch (error) {
		appLogger().error(error);
		ctx.response.status = error.httpCode ? error.httpCode : 500;

		if (match.route.responseFormat === 'html') {
			ctx.response.set('Content-Type', 'text/html');
			ctx.response.body = `<html>Error! ${error.message}</html>`;
		} else {
			ctx.response.set('Content-Type', 'application/json');
			ctx.response.body = { error: error.message };
		}
	}
});

async function main() {
	const env: string = argv.env as string || 'prod';

	if (env === 'prod') {
		initConfig(configProd);
	} else {
		initConfig(configDev);
	}

	await fs.mkdirp(config().logDir);
	Logger.fsDriver_ = new FsDriverNode();
	const globalLogger = new Logger();
	globalLogger.addTarget(TargetType.File, { path: `${config().logDir}/app.txt` });
	globalLogger.addTarget(TargetType.Console);
	Logger.initializeGlobalLogger(globalLogger);

	const pidFile = argv.pidfile as string;

	if (pidFile) {
		appLogger().info(`Writing PID to ${pidFile}...`);
		fs.removeSync(pidFile as string);
		fs.writeFileSync(pidFile, `${process.pid}`);
	}

	if (argv.migrateDb) {
		const db = await connectDb(config().database);
		await migrateDb(db);
		await disconnectDb(db);
	} else if (argv.dropDb) {
		await dropDb(config().database, { ignoreIfNotExists: true });
	} else if (argv.createDb) {
		await createDb(config().database);
	} else {
		appLogger().info(`Starting server (${env}) on port ${config().port} and PID ${process.pid}...`);
		appLogger().info(`Base URL: ${baseUrl()}`);
		appLogger().info(`DB Config: ${JSON.stringify(config().database)}`);

		const appContext = app.context as AppContext;
		appContext.db = await waitForConnection(config().database);
		appLogger().info('Connected to database!');

		await migrateDb(appContext.db);

		appContext.models = modelFactory(appContext.db);
		appContext.controllers = controllerFactory(appContext.models);

		appLogger().info(`Call this for testing: \`curl ${baseUrl()}/api/ping\``);

		app.listen(config().port);
	}
}

main().catch((error: any) => {
	console.error(error);
	process.exit(1);
});
