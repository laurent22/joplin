// Allows displaying error stack traces with TypeScript file paths
require('source-map-support').install();

import * as Koa from 'koa';
import * as fs from 'fs-extra';
import { argv } from 'yargs';
import Logger, { LoggerWrapper, TargetType } from '@joplin/lib/Logger';
import config, { initConfig, baseUrl } from './config';
import configDev from './config-dev';
import configProd from './config-prod';
import configBuildTypes from './config-buildTypes';
import { createDb, dropDb } from './tools/dbTools';
import { dropTables, connectDb, disconnectDb, migrateDb, waitForConnection } from './db';
import modelFactory from './models/factory';
import controllerFactory from './controllers/factory';
import { AppContext, Config, Env } from './utils/types';
import FsDriverNode from '@joplin/lib/fs-driver-node';
import requestProcessor from './middleware/requestProcessor';
import notificationHandler from './middleware/notificationHandler';

const { shimInit } = require('@joplin/lib/shim-init-node.js');
shimInit();

const env: Env = argv.env as Env || Env.Prod;

interface Configs {
	[name: string]: Config;
}

const configs: Configs = {
	dev: configDev,
	prod: configProd,
	buildTypes: configBuildTypes,
};

let appLogger_: LoggerWrapper = null;

function appLogger(): LoggerWrapper {
	if (!appLogger_) {
		appLogger_ = Logger.create('App');
	}
	return appLogger_;
}

const app = new Koa();

app.use(notificationHandler);
app.use(requestProcessor);

async function main() {
	const configObject: Config = configs[env];
	if (!configObject) throw new Error(`Invalid env: ${env}`);

	initConfig(configObject);

	await fs.mkdirp(config().logDir);
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
		appLogger().info('Public base URL:', baseUrl());
		appLogger().info('DB Config:', config().database);

		const appContext = app.context as AppContext;

		appLogger().info('Trying to connect to database...');
		const connectionCheck = await waitForConnection(config().database);

		const connectionCheckLogInfo = { ...connectionCheck };
		delete connectionCheckLogInfo.connection;

		appLogger().info('Connection check:', connectionCheckLogInfo);
		appContext.env = env;
		appContext.db = connectionCheck.connection;
		appContext.models = modelFactory(appContext.db, baseUrl());
		appContext.controllers = controllerFactory(appContext.models);
		appContext.appLogger = appLogger;

		appLogger().info('Migrating database...');
		await migrateDb(appContext.db);

		appLogger().info(`Call this for testing: \`curl ${baseUrl()}/api/ping\``);

		app.listen(config().port);
	}
}

main().catch((error: any) => {
	console.error(error);
	process.exit(1);
});
