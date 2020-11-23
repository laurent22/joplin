import { connectDb, DbConfig, disconnectDb } from '../app/db';
import Knex = require('knex');

const { execCommand } = require('@joplin/tools/tool-utils');

const packageRootDir = `${__dirname}/../..`;

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

	const db = await connectDb(config);
	await migrateDb(db);
	await disconnectDb(db);
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

export async function migrateDb(db: Knex) {
	const migrateConfig = {
		directory: `${packageRootDir}/dist/migrations`,
		// Disable transactions because the models might open one too
		disableTransactions: true,
	};

	await db.migrate.latest(migrateConfig);
}
