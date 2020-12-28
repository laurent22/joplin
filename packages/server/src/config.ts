import { rtrimSlashes } from '@joplin/lib/path-utils';
import { Config } from './utils/types';

let baseConfig_: Config = null;
let baseUrl_: string = null;

export function initConfig(baseConfig: Config) {
	baseConfig_ = baseConfig;
}

function config(): Config {
	if (!baseConfig_) throw new Error('Config has not been initialized!');
	return baseConfig_;
}

export function baseUrl() {
	if (baseUrl_) return baseUrl_;

	if (process.env.JOPLIN_BASE_URL) {
		baseUrl_ = rtrimSlashes(process.env.JOPLIN_BASE_URL);
	} else {
		baseUrl_ = `http://localhost:${config().port}`;
	}

	return baseUrl_;
}

export default config;
