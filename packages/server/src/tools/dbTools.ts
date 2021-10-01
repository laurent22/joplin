import { connectDb, disconnectDb, migrateLatest } from '../db';
import * as fs from 'fs-extra';
import { DatabaseConfig } from '../utils/types';

const { execCommand } = require('@joplin/tools/tool-utils');

export interface CreateDbOptions {
	dropIfExists?: boolean;
	autoMigrate?: boolean;
}

export interface DropDbOptions {
	ignoreIfNotExists: boolean;
}

export async function createDb(config: DatabaseConfig, options: CreateDbOptions = null) {
	options = {
		dropIfExists: false,
		autoMigrate: true,
		...options,
	};

	if (config.client === 'pg') {
		const cmd: string[] = [
			'createdb',
			'--host', config.host,
			'--port', config.port.toString(),
			'--username', config.user,
			config.name,
		];

		if (options.dropIfExists) {
			await dropDb(config, { ignoreIfNotExists: true });
		}

		await execCommand(cmd.join(' '), { env: { PGPASSWORD: config.password } });
	} else if (config.client === 'sqlite3') {
		const filePath = config.name;

		if (await fs.pathExists(filePath)) {
			if (options.dropIfExists) {
				await fs.remove(filePath);
			} else {
				throw new Error(`Database already exists: ${filePath}`);
			}
		}
	}

	try {
		const db = await connectDb(config);
		if (options.autoMigrate) await migrateLatest(db);
		await disconnectDb(db);
	} catch (error) {
		error.message += `: ${config.name}`;
		throw error;
	}
}

export async function dropDb(config: DatabaseConfig, options: DropDbOptions = null) {
	options = {
		ignoreIfNotExists: false,
		...options,
	};

	if (config.client === 'pg') {
		const cmd: string[] = [
			'dropdb',
			'--host', config.host,
			'--port', config.port.toString(),
			'--username', config.user,
			config.name,
		];

		try {
			await execCommand(cmd.join(' '), { env: { PGPASSWORD: config.password } });
		} catch (error) {
			if (options.ignoreIfNotExists && error.message.includes('does not exist')) return;
			throw error;
		}
	} else if (config.client === 'sqlite3') {
		await fs.remove(config.name);
	}
}
