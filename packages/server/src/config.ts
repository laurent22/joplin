import { Config } from './utils/types';

let baseConfig_: Config = null;

export function initConfig(baseConfig: Config) {
	baseConfig_ = baseConfig;
}

function config() {
	if (!baseConfig_) throw new Error('Config has not been initialized!');
	return baseConfig_;
}

export function baseUrl() {
	return `http://localhost:${config().port}`;
}

export default config;
