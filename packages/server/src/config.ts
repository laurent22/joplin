import { rtrimSlashes } from '@joplin/lib/path-utils';
import { Config } from './utils/types';

export interface EnvVariables {
	JOPLIN_BASE_URL?: string;
	JOPLIN_PORT?: string;

	JOPLIN_POSTGRES_PASSWORD?: string;
	JOPLIN_POSTGRES_DATABASE?: string;
	JOPLIN_POSTGRES_USER?: string;
	JOPLIN_POSTGRES_HOST?: string;
	JOPLIN_POSTGRES_PORT?: string;
}

let baseConfig_: Config = null;
let baseUrl_: string = null;
const envVariables_: EnvVariables = {};

export function initConfig(baseConfig: Config, envVariables: any) {
	// Keep a copy of it because we modify it below.
	baseConfig_ = JSON.parse(JSON.stringify(baseConfig));

	// Only keep the environment variables that start with "JOPLIN_"
	Object.keys(envVariables)
		.filter(k => k.indexOf('JOPLIN_') === 0)
		.forEach(k => (envVariables_ as any)[k] = (envVariables as any)[k]);

	if (envVariables_.JOPLIN_POSTGRES_DATABASE) baseConfig_.database.name = envVariables_.JOPLIN_POSTGRES_DATABASE;
	if (envVariables_.JOPLIN_POSTGRES_USER) baseConfig_.database.user = envVariables_.JOPLIN_POSTGRES_USER;
	if (envVariables_.JOPLIN_POSTGRES_PASSWORD) baseConfig_.database.password = envVariables_.JOPLIN_POSTGRES_PASSWORD;
	if (envVariables_.JOPLIN_POSTGRES_HOST) baseConfig_.database.host = envVariables_.JOPLIN_POSTGRES_HOST;
	if (envVariables_.JOPLIN_POSTGRES_PORT) baseConfig_.database.port = Number(envVariables_.JOPLIN_POSTGRES_PORT);
}

export function envVariables(): EnvVariables {
	return envVariables_;
}

function config(): Config {
	if (!baseConfig_) throw new Error('Config has not been initialized!');
	return baseConfig_;
}

export function baseUrl() {
	if (baseUrl_) return baseUrl_;

	if (envVariables_.JOPLIN_BASE_URL) {
		baseUrl_ = rtrimSlashes(envVariables_.JOPLIN_BASE_URL);
	} else {
		baseUrl_ = `http://localhost:${config().port}`;
	}

	return baseUrl_;
}

export default config;
