import { rtrimSlashes } from '@joplin/lib/path-utils';
import { Config, DatabaseConfig, DatabaseConfigClient } from './utils/types';
import * as pathUtils from 'path';

export interface EnvVariables {
	APP_BASE_URL?: string;
	APP_PORT?: string;
	DB_CLIENT?: string;
	RUNNING_IN_DOCKER?: string;

	POSTGRES_PASSWORD?: string;
	POSTGRES_DATABASE?: string;
	POSTGRES_USER?: string;
	POSTGRES_HOST?: string;
	POSTGRES_PORT?: string;

	SQLITE_DATABASE?: string;
}

let runningInDocker_: boolean = false;

export function runningInDocker(): boolean {
	return runningInDocker_;
}

function databaseHostFromEnv(runningInDocker: boolean, env: EnvVariables): string {
	if (env.POSTGRES_HOST) {
		// When running within Docker, the app localhost is different from the
		// host's localhost. To access the latter, Docker defines a special host
		// called "host.docker.internal", so here we swap the values if necessary.
		if (runningInDocker && ['localhost', '127.0.0.1'].includes(env.POSTGRES_HOST)) {
			return 'host.docker.internal';
		} else {
			return env.POSTGRES_HOST;
		}
	}

	return null;
}

function databaseConfigFromEnv(runningInDocker: boolean, env: EnvVariables): DatabaseConfig {
	if (env.DB_CLIENT === 'pg') {
		return {
			client: DatabaseConfigClient.PostgreSQL,
			name: env.POSTGRES_DATABASE || 'joplin',
			user: env.POSTGRES_USER || 'joplin',
			password: env.POSTGRES_PASSWORD || 'joplin',
			port: env.POSTGRES_PORT ? Number(env.POSTGRES_PORT) : 5432,
			host: databaseHostFromEnv(runningInDocker, env) || 'localhost',
		};
	}

	return {
		client: DatabaseConfigClient.SQLite,
		name: env.SQLITE_DATABASE || 'prod',
		asyncStackTraces: true,
	};
}

function baseUrlFromEnv(env: any, appPort: number): string {
	if (env.APP_BASE_URL) {
		return rtrimSlashes(env.APP_BASE_URL);
	} else {
		return `http://localhost:${appPort}`;
	}
}

let config_: Config = null;

export function initConfig(env: EnvVariables) {
	runningInDocker_ = !!env.RUNNING_IN_DOCKER;

	const rootDir = pathUtils.dirname(__dirname);
	const viewDir = `${pathUtils.dirname(__dirname)}/src/views`;
	const appPort = env.APP_PORT ? Number(env.APP_PORT) : 22300;

	config_ = {
		rootDir: rootDir,
		viewDir: viewDir,
		layoutDir: `${viewDir}/layouts`,
		logDir: `${rootDir}/logs`,
		database: databaseConfigFromEnv(runningInDocker_, env),
		port: appPort,
		baseUrl: baseUrlFromEnv(env, appPort),
	};
}

function config(): Config {
	if (!config_) throw new Error('Config has not been initialized!');
	return config_;
}

export default config;
