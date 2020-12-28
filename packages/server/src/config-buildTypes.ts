import { Config } from './utils/types';
import configBase from './config-base';

const config: Config = {
	...configBase,
	database: {
		name: 'buildTypes',
		client: 'sqlite3',
		asyncStackTraces: true,
	},
};

export default config;
