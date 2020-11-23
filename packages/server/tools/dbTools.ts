import { DbConfig } from "../app/db";

const { execCommand } = require('@joplin/tools/tool-utils');

export async function createDb(config:DbConfig) {
	const cmd:string[] = [
		'createdb',
		'--host', config.connection.host,
		'--port', config.connection.port.toString(),
		'--username', config.connection.user,
		config.connection.database,
	];

	await execCommand(cmd.join(' '));
}