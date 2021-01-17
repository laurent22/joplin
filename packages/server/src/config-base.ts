import { Config, DatabaseConfigClient } from './utils/types';
import * as pathUtils from 'path';

const rootDir = pathUtils.dirname(__dirname);
const viewDir = `${pathUtils.dirname(__dirname)}/src/views`;

const envPort = Number(process.env.APP_PORT);

const config: Config = {
	port: (envPort && !isNaN(envPort)) ? envPort : 22300,
	viewDir: viewDir,
	rootDir: rootDir,
	layoutDir: `${viewDir}/layouts`,
	logDir: `${rootDir}/logs`,
	database: {
		client: DatabaseConfigClient.PostgreSQL,
		name: 'joplin',
	},
	baseUrl: '',
};

export default config;
