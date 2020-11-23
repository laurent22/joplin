import { connectGlobalDb, DbConfig, disconnectGlobalDb, migrateGlobalDb } from '../app/db';

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

	await connectGlobalDb(config);
	await migrateGlobalDb();
	await disconnectGlobalDb();
}

export async function dropDb(config: DbConfig, options: DropDbOptions = null) {
	options = {
		ignoreIfNotExists: false,
		...options,
	};

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
}
