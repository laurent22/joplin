import { Config } from './utils/types';
import * as pathUtils from 'path';

const rootDir = pathUtils.dirname(__dirname);
const viewDir = `${pathUtils.dirname(__dirname)}/src/views`;

const config: Config = {
	port: 22300,
	viewDir: viewDir,
	rootDir: rootDir,
	layoutDir: `${viewDir}/layouts`,
	logDir: `${rootDir}/logs`,
	database: {
		client: 'pg',
		name: 'joplin',
	},
};

export default config;
