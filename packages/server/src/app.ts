// Allows displaying error stack traces with TypeScript file paths
require('source-map-support').install();

import * as Koa from 'koa';
import * as fs from 'fs-extra';
import Logger, { LoggerWrapper, TargetType } from '@joplin/lib/Logger';
import config, { fullVersionString, initConfig, runningInDocker } from './config';
import { migrateLatest, waitForConnection, sqliteDefaultDir, latestMigration } from './db';
import { AppContext, Env, KoaNext } from './utils/types';
import FsDriverNode from '@joplin/lib/fs-driver-node';
import { getDeviceTimeDrift } from '@joplin/lib/ntp';
import routeHandler from './middleware/routeHandler';
import notificationHandler from './middleware/notificationHandler';
import ownerHandler from './middleware/ownerHandler';
import setupAppContext from './utils/setupAppContext';
import { initializeJoplinUtils } from './utils/joplinUtils';
import startServices from './utils/startServices';
import { credentialFile } from './utils/testing/testUtils';
import apiVersionHandler from './middleware/apiVersionHandler';
import clickJackingHandler from './middleware/clickJackingHandler';
import newModelFactory from './models/factory';
import setupCommands from './utils/setupCommands';
import { RouteResponseFormat, routeResponseFormat } from './utils/routeUtils';
import { parseEnv } from './env';
import storageConnectionCheck from './utils/storageConnectionCheck';
import { setLocale } from '@joplin/lib/locale';
import checkAdminHandler from './middleware/checkAdminHandler';

interface Argv {
	env?: Env;
	pidfile?: string;
	envFile?: string;
}

const nodeSqlite = require('sqlite3');
const cors = require('@koa/cors');
const nodeEnvFile = require('node-env-file');
const { shimInit } = require('@joplin/lib/shim-init-node.js');
shimInit({ nodeSqlite });

const defaultEnvVariables: Record<Env, any> = {
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
	if (!o) return o;

	const output: Record<string, any> = {};

	for (const k of Object.keys(o)) {
		if (k.toLowerCase().includes('password') || k.toLowerCase().includes('secret') || k.toLowerCase().includes('connectionstring')) {
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
	const { selectedCommand, argv: yargsArgv } = await setupCommands();

	const argv: Argv = yargsArgv as any;
	const env: Env = argv.env as Env || Env.Prod;

	const envFilePath = await getEnvFilePath(env, argv);

	if (envFilePath) nodeEnvFile(envFilePath);

	if (!defaultEnvVariables[env]) throw new Error(`Invalid env: ${env}`);

	const envVariables = parseEnv(process.env, defaultEnvVariables[env]);

	const app = new Koa();

	// Note: the order of middlewares is important. For example, ownerHandler
	// loads the user, which is then used by notificationHandler. And finally
	// routeHandler uses data from both previous middlewares. It would be good to
	// layout these dependencies in code but not clear how to do this.
	const corsAllowedDomains = [
		'https://joplinapp.org',
	];

	if (env === Env.Dev) {
		corsAllowedDomains.push('http://localhost:8077');
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

			appLogger().error(`Middleware error on ${ctx.path}:`, error);

			const responseFormat = routeResponseFormat(ctx);

			if (responseFormat === RouteResponseFormat.Html) {
				// Since this is a low level error, rendering a view might fail too,
				// so catch this and default to rendering JSON.
				try {
					ctx.response.set('Content-Type', 'text/html');
					ctx.body = await ctx.joplin.services.mustache.renderView({
						name: 'error',
						title: 'Error',
						path: 'index/error',
						content: { error },
					});
				} catch (anotherError) {
					ctx.response.set('Content-Type', 'application/json');
					ctx.body = JSON.stringify({ error: `${error.message} (Check the server log for more information)` });
				}
			} else {
				ctx.response.set('Content-Type', 'application/json');
				ctx.body = JSON.stringify({ error: error.message });
			}
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
	app.use(checkAdminHandler);
	app.use(notificationHandler);
	app.use(clickJackingHandler);
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

	let runCommandAndExitApp = true;

	if (selectedCommand) {
		const commandArgv = {
			...argv,
			_: (argv as any)._.slice(),
		};
		commandArgv._.splice(0, 1);

		if (selectedCommand.commandName() === 'db') {
			await selectedCommand.run(commandArgv, {
				db: null,
				models: null,
			});
		} else {
			const connectionCheck = await waitForConnection(config().database);
			const models = newModelFactory(connectionCheck.connection, config());

			await selectedCommand.run(commandArgv, {
				db: connectionCheck.connection,
				models,
			});
		}
	} else {
		runCommandAndExitApp = false;

		appLogger().info(`Starting server ${fullVersionString(config())} (${env}) on port ${config().port} and PID ${process.pid}...`);

		if (config().maxTimeDrift) {
			appLogger().info(`Checking for time drift using NTP server: ${config().NTP_SERVER}`);
			const timeDrift = await getDeviceTimeDrift(config().NTP_SERVER);
			if (Math.abs(timeDrift) > config().maxTimeDrift) {
				throw new Error(`The device time drift is ${timeDrift}ms (Max allowed: ${config().maxTimeDrift}ms) - cannot continue as it could cause data loss and conflicts on the sync clients. You may increase env var MAX_TIME_DRIFT to pass the check, or set to 0 to disabled the check.`);
			}
			appLogger().info(`NTP time offset: ${timeDrift}ms`);
		} else {
			appLogger().info('Skipping NTP time check because MAX_TIME_DRIFT is 0.');
		}

		setLocale('en_GB');

		appLogger().info('Running in Docker:', runningInDocker());
		appLogger().info('Public base URL:', config().baseUrl);
		appLogger().info('API base URL:', config().apiBaseUrl);
		appLogger().info('User content base URL:', config().userContentBaseUrl);
		appLogger().info('Log dir:', config().logDir);
		appLogger().info('DB Config:', markPasswords(config().database));
		appLogger().info('Mailer Config:', markPasswords(config().mailer));
		appLogger().info('Content driver:', markPasswords(config().storageDriver));
		appLogger().info('Content driver (fallback):', markPasswords(config().storageDriverFallback));

		appLogger().info('Trying to connect to database...');
		const connectionCheck = await waitForConnection(config().database);

		const connectionCheckLogInfo = { ...connectionCheck };
		delete connectionCheckLogInfo.connection;

		appLogger().info('Connection check:', connectionCheckLogInfo);
		const ctx = app.context as AppContext;

		if (config().database.autoMigration) {
			appLogger().info('Auto-migrating database...');
			await migrateLatest(connectionCheck.connection);
			appLogger().info('Latest migration:', await latestMigration(connectionCheck.connection));
		} else {
			appLogger().info('Skipped database auto-migration.');
		}

		await setupAppContext(ctx, env, connectionCheck.connection, appLogger);

		await initializeJoplinUtils(config(), ctx.joplinBase.models, ctx.joplinBase.services.mustache);

		appLogger().info('Performing main storage check...');
		appLogger().info(await storageConnectionCheck(config().storageDriver, ctx.joplinBase.db, ctx.joplinBase.models));

		if (config().storageDriverFallback) {
			appLogger().info('Performing fallback storage check...');
			appLogger().info(await storageConnectionCheck(config().storageDriverFallback, ctx.joplinBase.db, ctx.joplinBase.models));
		}

		appLogger().info('Starting services...');
		await startServices(ctx.joplinBase.services);

		appLogger().info(`Call this for testing: \`curl ${config().apiBaseUrl}/api/ping\``);

		app.listen(config().port);
	}

	if (runCommandAndExitApp) process.exit(0);
}

main().catch((error: any) => {
	console.error(error);
	process.exit(1);
});
