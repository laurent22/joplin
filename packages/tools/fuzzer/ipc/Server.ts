import { join, resolve } from 'path';
import { HttpMethod, Json, UserData } from '../types';
import JoplinServerApi from '@joplin/lib/JoplinServerApi';
import { Env } from '@joplin/lib/models/Setting';
import execa = require('execa');
import { msleep } from '@joplin/utils/time';
import Logger from '@joplin/utils/Logger';
import { strict as assert } from 'assert';
import { copy, exists } from 'fs-extra';
import { copyFile } from 'fs/promises';

const logger = Logger.create('Server');

const createApi = async (serverUrl: string, adminAuth: UserData) => {
	const api = new JoplinServerApi({
		baseUrl: () => serverUrl,
		userContentBaseUrl: () => serverUrl,
		password: () => adminAuth.password,
		username: () => adminAuth.email,
		session: ()=>null,
		apiKey: ()=>'',
		env: Env.Dev,
	});
	await api.loadSession();
	return api;
};

interface ServerConfig {
	baseUrl: string;
	baseDirectory: string;
	adminAuth: UserData;
}

interface FromSnapshotOptions extends ServerConfig {
	snapshotDirectory: string;
}

export default class Server {
	private api_: JoplinServerApi|null = null;
	private serverUrl_: string;
	private adminAuth_: UserData;
	private server_: execa.ExecaChildProcess<string>;
	private baseDirectory_: string;

	public constructor(config: ServerConfig) {
		this.adminAuth_ = config.adminAuth;

		const serverDir = resolve(config.baseDirectory);
		this.baseDirectory_ = serverDir;

		this.serverUrl_ = config.baseUrl;

		// Code in other places (e.g. the JoplinServerApi) assumes that serverUrl_ ends with a "/"
		if (!this.serverUrl_.endsWith('/')) {
			this.serverUrl_ = `${this.serverUrl_}/`;
		}

		const mainEntrypoint = join(serverDir, 'dist', 'app.js');
		this.server_ = execa.node(mainEntrypoint, [
			'--env', 'dev',
		], {
			env: {
				JOPLIN_IS_TESTING: '1',
			},
			cwd: serverDir,
			stdin: 'ignore', // No stdin
			// For debugging:
			stderr: process.stderr,
			// stdout: process.stdout,
		});
	}

	private static assertCanUseSnapshots_() {
		if (process.env.SQLITE_DATABASE) {
			throw new Error(`Unsupported: Creating snapshots of a non-default database (${JSON.stringify(process.env.SQLITE_DATABASE)}) is not supported. Skipping...`);
		}
		if ((process.env.DB_CLIENT ?? 'sqlite') !== 'sqlite') {
			throw new Error(`Not supported: Creating snapshots of a non-sqlite database is not supported (DB_CLIENT: ${process.env.DB_CLIENT}). Skipping...`);
		}
	}

	public assertCanUseSnapshots() {
		// For now, alias the static method. In the future, more checks that require
		// a server instance may be added:
		Server.assertCanUseSnapshots_();
	}

	public static async fromSnapshot({
		baseDirectory: serverBaseDirectory, snapshotDirectory, ...config
	}: FromSnapshotOptions) {
		this.assertCanUseSnapshots_();

		const serverDatabaseFile = join(serverBaseDirectory, 'db-dev.sqlite');
		logger.info('Restoring', serverDatabaseFile, '... Replacing with version from snapshot...');
		await copy(join(snapshotDirectory, 'server', 'db-dev.sqlite'), serverDatabaseFile);

		return new Server({
			baseDirectory: serverBaseDirectory,
			...config,
		});
	}

	public async saveSnapshot(outputDirectory: string) {
		Server.assertCanUseSnapshots_();

		// Note: Assumes that the server is using SQLite!
		const databasePath = join(this.baseDirectory_, 'db-dev.sqlite');
		logger.info('Creating snapshot of', databasePath, '...');

		assert.ok(await exists(outputDirectory));
		const destination = join(outputDirectory, 'db-dev.sqlite');
		await copyFile(databasePath, destination);
	}

	public get url() {
		return this.serverUrl_;
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

	public async execApi(method: HttpMethod, route: string, action: Json|undefined): Promise<Json> {
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


