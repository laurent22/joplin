import { Config } from './utils/types';
import configBase from './config-base';

const rootDir = __dirname; // '/home/joplin/';

const config: Config = {
	...configBase,
	rootDir: rootDir,
	logDir: `${rootDir}/logs`,
	database: {
		name: 'prod',
		client: 'sqlite3',
		asyncStackTraces: true,
	},
	// database: {
	// 	client: 'pg',
	// 	name: 'joplin',
	// 	user: 'joplin',
	// 	host: 'db',
	// 	port: 5432,
	// 	password: 'joplin',
	// },
};

export default config;
