import { Config } from './utils/types';
import configBase from './config-base';

const config: Config = {
	...configBase,
	database: {
		name: 'dev',
		client: 'sqlite3',
		asyncStackTraces: true,
	},
	// database: {
	// 	client: 'pg',
	// 	name: 'joplin',
	// 	user: 'joplin',
	// 	host: 'localhost',
	// 	port: 5432,
	// 	password: 'joplin',
	// 	asyncStackTraces: true,
	// },
};

export default config;
