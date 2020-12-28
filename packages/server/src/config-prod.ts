import { Config } from './utils/types';
import configBase from './config-base';

const rootDir = '/home/joplin/';

const config: Config = {
	...configBase,
	rootDir: rootDir,
	logDir: `${rootDir}/logs`,
	database: {
		client: 'pg',
		name: 'joplin',
		user: 'joplin',
		host: 'db',
		port: 5432,
		password: 'joplin',
	},
};

export default config;
