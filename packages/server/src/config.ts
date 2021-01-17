import { rtrimSlashes } from '@joplin/lib/path-utils';
import { Config } from './utils/types';

export interface EnvVariables {
	APP_BASE_URL?: string;
	APP_PORT?: string;
	DB_CLIENT?: string;

	POSTGRES_PASSWORD?: string;
	POSTGRES_DATABASE?: string;
	POSTGRES_USER?: string;
	POSTGRES_HOST?: string;
	POSTGRES_PORT?: string;
}

let runningInDocker_: boolean = false;

export function runningInDocker(): boolean {
	return runningInDocker_;
}

function databaseHostFromEnv(runningInDocker: boolean, envVariables: any): string {
	if (envVariables.POSTGRES_HOST) {
		// When running within Docker, the app localhost is different from the
		// host's localhost. To access the latter, Docker defines a special host
		// called "host.docker.internal", so here we swap the values if necessary.
		if (runningInDocker && ['localhost', '127.0.0.1'].includes(envVariables.POSTGRES_HOST)) {
			return 'host.docker.internal';
		} else {
			return envVariables.POSTGRES_HOST;
		}
	}

	return null;
}

let baseConfig_: Config = null;

export function initConfig(baseConfig: Config, envVariables: any) {
	// Keep a copy of it because we modify it below.
	baseConfig_ = JSON.parse(JSON.stringify(baseConfig));
	runningInDocker_ = !!envVariables.RUNNING_IN_DOCKER;

	if (envVariables.APP_PORT) baseConfig_.port = envVariables.APP_PORT;
	if (envVariables.DB_CLIENT) baseConfig_.database.client = envVariables.DB_CLIENT;
	if (envVariables.POSTGRES_DATABASE) baseConfig_.database.name = envVariables.POSTGRES_DATABASE;
	if (envVariables.POSTGRES_USER) baseConfig_.database.user = envVariables.POSTGRES_USER;
	if (envVariables.POSTGRES_PASSWORD) baseConfig_.database.password = envVariables.POSTGRES_PASSWORD;
	if (envVariables.POSTGRES_PORT) baseConfig_.database.port = Number(envVariables.POSTGRES_PORT);

	const dbHost = databaseHostFromEnv(runningInDocker_, envVariables);
	if (dbHost) baseConfig_.database.host = dbHost;

	if (envVariables.APP_BASE_URL) {
		baseConfig_.baseUrl = rtrimSlashes(envVariables.APP_BASE_URL);
	} else {
		baseConfig_.baseUrl = `http://localhost:${baseConfig_.port}`;
	}
}

function config(): Config {
	if (!baseConfig_) throw new Error('Config has not been initialized!');
	return baseConfig_;
}

export function baseUrl() {
	return baseConfig_.baseUrl;
}

export default config;
