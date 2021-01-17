import { Config } from './utils/types';
import configBase from './config-base';

const rootDir = '/home/joplin/';

const name = process.env.JOPLIN_DB_NAME || 'joplin'
const user = process.env.JOPLIN_DB_USER || 'joplin'
const password = process.env.JOPLIN_DB_PASSWORD || 'joplin'
const host = process.env.JOPLIN_DB_HOST || 'db'
const port = process.env.JOPLIN_DB_PORT || '5432'

const config: Config = {
	...configBase,
	rootDir: rootDir,
	logDir: `${rootDir}/logs`,
	database: {
		client: 'pg',
		name,
		user,
		host,
		port,
		password,
	},
};

export default config;
