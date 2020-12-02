import { Config } from './utils/types';
const viewDir = `${__dirname}/views`;

const config: Config = {
	port: 22300,
	viewDir: viewDir,
	layoutDir: `${viewDir}/layouts`,
	database: {
		client: 'pg',
		name: 'joplin',
	},
};

export default config;
