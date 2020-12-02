import { connectDb, disconnectDb, migrateDb, sqliteFilePath } from '../db';
import * as fs from 'fs-extra';
import { DatabaseConfig } from '../utils/types';

const { execCommand } = require('@joplin/tools/tool-utils');

export interface CreateDbOptions {
	dropIfExists: boolean;
}

export interface DropDbOptions {
	ignoreIfNotExists: boolean;
}

export async function createDb(config: DatabaseConfig, options: CreateDbOptions = null) {
	options = {
		dropIfExists: false,
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

		await execCommand(cmd.join(' '));
	} else if (config.client === 'sqlite3') {
		const filePath = sqliteFilePath(config);

		if (await fs.pathExists(filePath)) {
			if (options.dropIfExists) {
				await fs.remove(filePath);
			} else {
				throw new Error(`Database already exists: ${filePath}`);
			}
		}
	}

	const db = await connectDb(config);
	await migrateDb(db);
	await disconnectDb(db);
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
			await execCommand(cmd.join(' '));
		} catch (error) {
			if (options.ignoreIfNotExists && error.message.includes('does not exist')) return;
			throw error;
		}
	} else if (config.client === 'sqlite3') {
		await fs.remove(sqliteFilePath(config));
	}
}
