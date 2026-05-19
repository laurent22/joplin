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
	dockerImage: string|null;
	adminAuth: UserData;
}

interface FromSnapshotOptions extends ServerConfig {
	snapshotDirectory: string;
}

export default class Server {
	private api_: JoplinServerApi|null = null;
	private serverUrl_: string;
	private adminAuth_: UserData;
	private usingDocker_: boolean;
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

		this.usingDocker_ = !!config.dockerImage;
		this.server_ = startServerProcess(config, this.usingDocker_);
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
		Server.assertCanUseSnapshots_();

		if (this.usingDocker_) {
			throw new Error('Not supported: Creating snapshots while using a server instance in Docker.');
		}
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

const startServerProcess = (config: ServerConfig, useDocker: boolean) => {
	const baseDirectory = resolve(config.baseDirectory);
	if (useDocker) {
		if (!config.dockerImage) {
			throw new Error('Attempting to run in Docker without a Docker image specified');
		}

		return execa('docker', [
			'run',
			// The MAX_TIME_DRIFT check isn't necessary: All clients will be running
			// with the same system clock.
			'--env', 'MAX_TIME_DRIFT=0',
			'--env', 'JOPLIN_IS_TESTING=1',
			config.dockerImage,
			'node', 'dist/app.js',
			'--env', 'dev',
		], {
			cwd: baseDirectory,
			stdin: 'ignore', // No stdin
			// For debugging:
			stderr: process.stderr,
			// stdout: process.stdout,
		});
	} else {
		const mainEntrypoint = join(baseDirectory, 'dist', 'app.js');
		return execa.node(mainEntrypoint, [
			'--env', 'dev',
		], {
			env: {
				JOPLIN_IS_TESTING: '1',
			},
			cwd: baseDirectory,
			stdin: 'ignore', // No stdin
			// For debugging:
			stderr: process.stderr,
			// stdout: process.stdout,
		});
	}
};
