import { connectDb, DbConfig, disconnectDb, migrateDb } from '../db';
import * as fs from 'fs-extra';

const { execCommand } = require('@joplin/tools/tool-utils');

export interface CreateDbOptions {
	dropIfExists: boolean;
}

export interface DropDbOptions {
	ignoreIfNotExists: boolean;
}

export async function createDb(config: DbConfig, options: CreateDbOptions = null) {
	options = {
		dropIfExists: false,
		...options,
	};

	if (config.client === 'pg') {
		const cmd: string[] = [
			'createdb',
			'--host', config.connection.host,
			'--port', config.connection.port.toString(),
			'--username', config.connection.user,
			config.connection.database,
		];

		if (options.dropIfExists) {
			await dropDb(config, { ignoreIfNotExists: true });
		}

		await execCommand(cmd.join(' '));
	} else if (config.client === 'sqlite3') {
		if (await fs.pathExists(config.connection.filename)) {
			if (options.dropIfExists) {
				await fs.remove(config.connection.filename);
			} else {
				throw new Error(`Database already exists: ${config.connection.filename}`);
			}
		}
	}

	const db = await connectDb(config);
	await migrateDb(db);
	await disconnectDb(db);
}

export async function dropDb(config: DbConfig, options: DropDbOptions = null) {
	options = {
		ignoreIfNotExists: false,
		...options,
	};

	if (config.client === 'pg') {
		const cmd: string[] = [
			'dropdb',
			'--host', config.connection.host,
			'--port', config.connection.port.toString(),
			'--username', config.connection.user,
			config.connection.database,
		];

		try {
			await execCommand(cmd.join(' '));
		} catch (error) {
			if (options.ignoreIfNotExists && error.message.includes('does not exist')) return;
			throw error;
		}
	} else if (config.client === 'sqlite3') {
		await fs.remove(config.connection.filename);
	}
}
