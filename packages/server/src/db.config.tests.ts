import { DbConfig } from './db';

const nodeEnv = process.env.NODE_ENV || 'development';
const packageRootDir = `${__dirname}/..`;

export default function(name: string, client: string = 'pg'): DbConfig {
	if (client === 'sqlite3') {
		return {
			client: 'sqlite3',
			connection: {
				filename: `${packageRootDir}/db-${name}.sqlite`,
			},
			useNullAsDefault: true,
			// Allow propery stack traces in case of an error, however
			// it has a small performance overhead so only enable in testing and dev
			asyncStackTraces: nodeEnv == 'development' || nodeEnv === 'testing',
			// debug: nodeEnv == 'development' || nodeEnv === 'testing',
		};
	}

	if (client === 'pg') {
		return {
			client: 'pg',
			connection: {
				host: '127.0.0.1',
				port: 5432,
				user: 'laurent',
				database: 'joplin',
			},
		};
	}

	throw new Error(`Unsupported client: ${client}`);
}
