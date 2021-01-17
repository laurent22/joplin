import { Config, DatabaseConfigClient } from './utils/types';
import configBase from './config-base';

const config: Config = {
	...configBase,
	database: {
		name: 'buildTypes',
		client: DatabaseConfigClient.SQLite,
		asyncStackTraces: true,
	},
};

export default config;
