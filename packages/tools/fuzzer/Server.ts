import { join } from 'path';
import { HttpMethod, Json, UserData } from './types';
import { packagesDir } from './constants';
import JoplinServerApi from '@joplin/lib/JoplinServerApi';
import { Env } from '@joplin/lib/models/Setting';
import execa = require('execa');
import { msleep } from '@joplin/utils/time';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('Server');

const createApi = async (serverUrl: string, adminAuth: UserData) => {
	const api = new JoplinServerApi({
		baseUrl: () => serverUrl,
		userContentBaseUrl: () => serverUrl,
		password: () => adminAuth.password,
		username: () => adminAuth.email,
		session: ()=>null,
		env: Env.Dev,
	});
	await api.loadSession();
	return api;
};

export default class Server {
	private api_: JoplinServerApi|null = null;
	private server_: execa.ExecaChildProcess<string>;

	public constructor(
		private readonly serverUrl_: string,
		private readonly adminAuth_: UserData,
	) {
		const serverDir = join(packagesDir, 'server');
		const mainEntrypoint = join(serverDir, 'dist', 'app.js');
		this.server_ = execa.node(mainEntrypoint, [
			'--env', 'dev',
		], {
			env: { JOPLIN_IS_TESTING: '1' },
			cwd: join(packagesDir, 'server'),
			stdin: 'ignore', // No stdin
			// For debugging:
			// stderr: process.stderr,
			// stdout: process.stdout,
		});
	}

	public async checkConnection() {
		let lastError;
		for (let retry = 0; retry < 30; retry++) {
			try {
				const response = await fetch(`${this.serverUrl_}api/ping`);
				if (response.ok) {
					return true;
				}
			} catch (error) {
				lastError = error;
			}
			await msleep(500);
		}
		if (lastError) {
			throw lastError;
		}
		return false;
	}

	public async execApi(method: HttpMethod, route: string, action: Json) {
		this.api_ ??= await createApi(this.serverUrl_, this.adminAuth_);
		logger.debug('API EXEC', method, route, action);
		const result = await this.api_.exec(method, route, {}, action);
		return result;
	}

	public async close() {
		this.server_.cancel();
		logger.info('Closed the server.');
	}
}


