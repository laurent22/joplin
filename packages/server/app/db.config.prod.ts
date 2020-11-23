import { DbConfig } from './db';

const config: DbConfig = {
	client: 'pg',
	connection: {
		host: '127.0.0.1',
		port: 5432,
		user: 'laurent',
		database: 'joplin',
	},
};

export default config;
