// Allows displaying error stack traces with TypeScript file paths
require('source-map-support').install();

import * as Koa from 'koa';
import * as fs from 'fs-extra';
import { argv } from 'yargs';
import Logger, { LoggerWrapper, TargetType } from '@joplin/lib/Logger';
import config, { initConfig, runningInDocker, EnvVariables } from './config';
import { createDb, dropDb } from './tools/dbTools';
import { dropTables, connectDb, disconnectDb, migrateDb, waitForConnection, sqliteFilePath } from './db';
import { AppContext, Env } from './utils/types';
import FsDriverNode from '@joplin/lib/fs-driver-node';
import routeHandler from './middleware/routeHandler';
import notificationHandler from './middleware/notificationHandler';
import ownerHandler from './middleware/ownerHandler';
import setupAppContext from './utils/setupAppContext';
import { initializeJoplinUtils } from './utils/joplinUtils';
import startServices from './utils/startServices';
// import { createItemTree } from './utils/testing/testUtils';

const nodeEnvFile = require('node-env-file');
const { shimInit } = require('@joplin/lib/shim-init-node.js');
shimInit();

const env: Env = argv.env as Env || Env.Prod;

const envVariables: Record<Env, EnvVariables> = {
	dev: {
		SQLITE_DATABASE: 'dev',
	},
	buildTypes: {
		SQLITE_DATABASE: 'buildTypes',
	},
	prod: {}, // Actually get the env variables from the environment
};

let appLogger_: LoggerWrapper = null;

function appLogger(): LoggerWrapper {
	if (!appLogger_) {
		appLogger_ = Logger.create('App');
	}
	return appLogger_;
}

const app = new Koa();

// Note: the order of middlewares is important. For example, ownerHandler
// loads the user, which is then used by notificationHandler. And finally
// routeHandler uses data from both previous middlewares. It would be good to
// layout these dependencies in code but not clear how to do this.
app.use(ownerHandler);
app.use(notificationHandler);
app.use(routeHandler);

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

async function main() {
	if (argv.envFile) {
		nodeEnvFile(argv.envFile);
	}

	if (!envVariables[env]) throw new Error(`Invalid env: ${env}`);

	initConfig({
		...envVariables[env],
		...process.env,
	});

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
		appLogger().info(`Starting server (${env}) on port ${config().port} and PID ${process.pid}...`);
		appLogger().info('Running in Docker:', runningInDocker());
		appLogger().info('Public base URL:', config().baseUrl);
		appLogger().info('Log dir:', config().logDir);
		appLogger().info('DB Config:', markPasswords(config().database));
		if (config().database.client === 'sqlite3') appLogger().info('DB file:', sqliteFilePath(config().database.name));

		appLogger().info('Trying to connect to database...');
		const connectionCheck = await waitForConnection(config().database);

		const connectionCheckLogInfo = { ...connectionCheck };
		delete connectionCheckLogInfo.connection;

		appLogger().info('Connection check:', connectionCheckLogInfo);
		const appContext = app.context as AppContext;

		await setupAppContext(appContext, env, connectionCheck.connection, appLogger);
		await initializeJoplinUtils(config(), appContext.models);

		appLogger().info('Migrating database...');
		await migrateDb(appContext.db);

		appLogger().info('Starting services...');
		await startServices(appContext);

		// if (env !== Env.Prod) {
		// 	const done = await handleDebugCommands(argv, appContext.db, config());
		// 	if (done) {
		// 		appLogger().info('Debug command has been executed. Now starting server...');
		// 	}
		// }

		appLogger().info(`Call this for testing: \`curl ${config().baseUrl}/api/ping\``);

		// const tree: any = {
		// 	'000000000000000000000000000000F1': {},
		// 	'000000000000000000000000000000F2': {
		// 		'00000000000000000000000000000001': null,
		// 		'00000000000000000000000000000002': null,
		// 	},
		// 	'000000000000000000000000000000F3': {
		// 		'00000000000000000000000000000003': null,
		// 		'000000000000000000000000000000F4': {
		// 			'00000000000000000000000000000004': null,
		// 			'00000000000000000000000000000005': null,
		// 		},
		// 	},
		// 	'00000000000000000000000000000006': null,
		// 	'00000000000000000000000000000007': null,
		// };

		// const users = await appContext.models.user().all();

		// const itemModel = appContext.models.item({ userId: users[0].id });

		// await createItemTree(itemModel, '', tree);

		app.listen(config().port);
	}
}

main().catch((error: any) => {
	console.error(error);
	process.exit(1);
});
