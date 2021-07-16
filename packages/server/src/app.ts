// Allows displaying error stack traces with TypeScript file paths
require('source-map-support').install();

import * as Koa from 'koa';
import * as fs from 'fs-extra';
import { argv } from 'yargs';
import Logger, { LoggerWrapper, TargetType } from '@joplin/lib/Logger';
import config, { initConfig, runningInDocker, EnvVariables } from './config';
import { createDb, dropDb } from './tools/dbTools';
import { dropTables, connectDb, disconnectDb, migrateDb, waitForConnection, sqliteDefaultDir } from './db';
import { AppContext, Env, KoaNext } from './utils/types';
import FsDriverNode from '@joplin/lib/fs-driver-node';
import routeHandler from './middleware/routeHandler';
import notificationHandler from './middleware/notificationHandler';
import ownerHandler from './middleware/ownerHandler';
import setupAppContext from './utils/setupAppContext';
import { initializeJoplinUtils } from './utils/joplinUtils';
import startServices from './utils/startServices';
import { credentialFile } from './utils/testing/testUtils';
import apiVersionHandler from './middleware/apiVersionHandler';

const cors = require('@koa/cors');
const nodeEnvFile = require('node-env-file');
const { shimInit } = require('@joplin/lib/shim-init-node.js');
shimInit();

const env: Env = argv.env as Env || Env.Prod;

const defaultEnvVariables: Record<Env, EnvVariables> = {
	dev: {
		// To test with the Postgres database, uncomment DB_CLIENT below and
		// comment out SQLITE_DATABASE. Then start the Postgres server using
		// `docker-compose --file docker-compose.db-dev.yml up`

		// DB_CLIENT: 'pg',
		SQLITE_DATABASE: `${sqliteDefaultDir}/db-dev.sqlite`,
	},
	buildTypes: {
		SQLITE_DATABASE: `${sqliteDefaultDir}/db-buildTypes.sqlite`,
	},
	prod: {
		SQLITE_DATABASE: `${sqliteDefaultDir}/db-prod.sqlite`,
	},
};

let appLogger_: LoggerWrapper = null;

function appLogger(): LoggerWrapper {
	if (!appLogger_) {
		appLogger_ = Logger.create('App');
	}
	return appLogger_;
}

function markPasswords(o: Record<string, any>): Record<string, any> {
	const output: Record<string, any> = {};

	for (const k of Object.keys(o)) {
		if (k.toLowerCase().includes('password')) {
			output[k] = '********';
		} else {
			output[k] = o[k];
		}
	}

	return output;
}

async function getEnvFilePath(env: Env, argv: any): Promise<string> {
	if (argv.envFile) return argv.envFile;

	if (env === Env.Dev) {
		return credentialFile('server.env');
	}

	return '';
}

async function main() {
	const envFilePath = await getEnvFilePath(env, argv);

	if (envFilePath) nodeEnvFile(envFilePath);

	if (!defaultEnvVariables[env]) throw new Error(`Invalid env: ${env}`);

	const envVariables: EnvVariables = {
		...defaultEnvVariables[env],
		...process.env,
	};

	const app = new Koa();

	// app.use(async function responseTime(ctx:AppContext, next:Function) {
	// 	const start = Date.now();
	// 	await next();
	// 	const ms = Date.now() - start;
	// 	console.info('Response time', ms)
	// 	//ctx.set('X-Response-Time', `${ms}ms`);
	// });

	// Note: the order of middlewares is important. For example, ownerHandler
	// loads the user, which is then used by notificationHandler. And finally
	// routeHandler uses data from both previous middlewares. It would be good to
	// layout these dependencies in code but not clear how to do this.
	const corsAllowedDomains = [
		'https://joplinapp.org',
	];

	if (env === Env.Dev) {
		corsAllowedDomains.push('http://localhost:8080');
	}

	function acceptOrigin(origin: string): boolean {
		const hostname = (new URL(origin)).hostname;
		const userContentDomain = envVariables.USER_CONTENT_BASE_URL ? (new URL(envVariables.USER_CONTENT_BASE_URL)).hostname : '';

		if (hostname === userContentDomain) return true;

		const hostnameNoSub = hostname.split('.').slice(1).join('.');

		// console.info('CORS check for origin', origin, 'Allowed domains', corsAllowedDomains);

		if (hostnameNoSub === userContentDomain) return true;

		if (corsAllowedDomains.includes(origin)) return true;

		return false;
	}

	// This is used to catch any low level error thrown from a middleware. It
	// won't deal with errors from routeHandler, which catches and handles its
	// own errors.
	app.use(async (ctx: AppContext, next: KoaNext) => {
		try {
			await next();
		} catch (error) {
			ctx.status = error.httpCode || 500;
			ctx.body = JSON.stringify({ error: error.message });
		}
	});

	// Creates the request-specific "joplin" context property.
	app.use(async (ctx: AppContext, next: KoaNext) => {
		ctx.joplin = {
			...ctx.joplinBase,
			owner: null,
			notifications: [],
		};

		return next();
	});

	app.use(cors({
		// https://github.com/koajs/cors/issues/52#issuecomment-413887382
		origin: (ctx: AppContext) => {
			const origin = ctx.request.header.origin;

			if (acceptOrigin(origin)) {
				return origin;
			} else {
				// we can't return void, so let's return one of the valid domains
				return corsAllowedDomains[0];
			}
		},
	}));

	app.use(apiVersionHandler);
	app.use(ownerHandler);
	app.use(notificationHandler);
	app.use(routeHandler);

	await initConfig(env, envVariables);

	await fs.mkdirp(config().logDir);
	await fs.mkdirp(config().tempDir);

	Logger.fsDriver_ = new FsDriverNode();
	const globalLogger = new Logger();
	// globalLogger.addTarget(TargetType.File, { path: `${config().logDir}/app.txt` });
	globalLogger.addTarget(TargetType.Console, {
		format: '%(date_time)s: [%(level)s] %(prefix)s: %(message)s',
		formatInfo: '%(date_time)s: %(prefix)s: %(message)s',
	});
	Logger.initializeGlobalLogger(globalLogger);

	if (envFilePath) appLogger().info(`Env variables were loaded from: ${envFilePath}`);

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
	} else if (argv.dropTables) {
		const db = await connectDb(config().database);
		await dropTables(db);
		await disconnectDb(db);
	} else if (argv.createDb) {
		await createDb(config().database);
	} else {
		appLogger().info(`Starting server v${config().appVersion} (${env}) on port ${config().port} and PID ${process.pid}...`);
		appLogger().info('Running in Docker:', runningInDocker());
		appLogger().info('Public base URL:', config().baseUrl);
		appLogger().info('API base URL:', config().apiBaseUrl);
		appLogger().info('User content base URL:', config().userContentBaseUrl);
		appLogger().info('Log dir:', config().logDir);
		appLogger().info('DB Config:', markPasswords(config().database));

		appLogger().info('Trying to connect to database...');
		const connectionCheck = await waitForConnection(config().database);

		const connectionCheckLogInfo = { ...connectionCheck };
		delete connectionCheckLogInfo.connection;

		appLogger().info('Connection check:', connectionCheckLogInfo);
		const ctx = app.context as AppContext;

		await setupAppContext(ctx, env, connectionCheck.connection, appLogger);
		await initializeJoplinUtils(config(), ctx.joplinBase.models, ctx.joplinBase.services.mustache);

		appLogger().info('Migrating database...');
		await migrateDb(ctx.joplinBase.db);

		appLogger().info('Starting services...');
		await startServices(ctx.joplinBase.services);

		appLogger().info(`Call this for testing: \`curl ${config().apiBaseUrl}/api/ping\``);

		app.listen(config().port);
	}
}

main().catch((error: any) => {
	console.error(error);
	process.exit(1);
});
