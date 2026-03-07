import { Day, Hour, Minute, Second } from '@joplin/utils/time';

export const defaultEnvValues: EnvVariables = {
	SERVER_PORT: 4567,
	API_KEY: '',
	QUEUE_TTL: 15 * Minute,
	QUEUE_RETRY_COUNT: 2,
	QUEUE_MAINTENANCE_INTERVAL: 60 * Second,
	DATA_DIR: '',
	HTR_CLI_BINARY_PATH: '',
	QUEUE_DRIVER: 'pg', // 'sqlite'
	QUEUE_DATABASE_PASSWORD: '',
	QUEUE_DATABASE_USER: '',
	QUEUE_DATABASE_PORT: 5432,
	FILE_STORAGE_MAINTENANCE_INTERVAL: 1 * Hour,
	FILE_STORAGE_TTL: 7 * Day,
	QUEUE_DATABASE_HOST: 'localhost',
	IMAGE_MAX_DIMENSION: 400,
};

export interface EnvVariables {
	SERVER_PORT: number;
	API_KEY: string;
	QUEUE_TTL: number;
	QUEUE_RETRY_COUNT: number;
	QUEUE_MAINTENANCE_INTERVAL: number;
	DATA_DIR: string;
	HTR_CLI_BINARY_PATH: string;
	QUEUE_DRIVER: string;
	QUEUE_DATABASE_PASSWORD: string;
	QUEUE_DATABASE_USER: string;
	QUEUE_DATABASE_PORT: number;
	FILE_STORAGE_MAINTENANCE_INTERVAL: number;
	FILE_STORAGE_TTL: number;
	QUEUE_DATABASE_HOST: string;
	IMAGE_MAX_DIMENSION: number;
}

export interface ComputedEnvVariables extends EnvVariables {
	HTR_CLI_IMAGES_FOLDER: string;
	HTR_CLI_MODELS_FOLDER: string;
	QUEUE_DATABASE_NAME: string;
}

export function parseEnv(rawEnv: Record<string, string | undefined>): ComputedEnvVariables {
	const output: EnvVariables = {
		...defaultEnvValues,
	};

	for (const [key, value] of Object.entries(defaultEnvValues)) {
		const rawEnvValue = rawEnv[key];

		if (rawEnvValue === undefined || rawEnvValue === '') continue;

		const typedKey = key as keyof EnvVariables;

		if (typeof value === 'number') {
			const v = Number(rawEnvValue);
			if (isNaN(v)) throw new Error(`Invalid number value "${rawEnvValue}"`);
			(output as Record<keyof EnvVariables, string | number>)[typedKey] = v;
		} else if (typeof value === 'string') {
			(output as Record<keyof EnvVariables, string | number>)[typedKey] = `${rawEnvValue}`;
		} else {
			throw new Error(`Invalid env default value type: ${typeof value}`);
		}
	}

	// Derive paths from DATA_DIR
	let queueDatabaseName: string;
	if (output.QUEUE_DRIVER === 'sqlite') {
		queueDatabaseName = `${output.DATA_DIR}/queue.sqlite3`;
	} else {
		// For PostgreSQL, use env var or default to 'transcribe'
		queueDatabaseName = rawEnv['QUEUE_DATABASE_NAME'] || 'transcribe';
	}

	const computed: ComputedEnvVariables = {
		...output,
		HTR_CLI_IMAGES_FOLDER: `${output.DATA_DIR}/images`,
		HTR_CLI_MODELS_FOLDER: `${output.DATA_DIR}/models`,
		QUEUE_DATABASE_NAME: queueDatabaseName,
	};

	return computed;
}

// Should always be called after require('dotenv').config()
const env = (): ComputedEnvVariables => {
	const rawEnv = Object.keys(defaultEnvValues)
		.reduce((env: Record<string, string | undefined>, key) => {
			env[key] = process.env[key];
			return env;
		}, {} as Record<string, string | undefined>);

	// Also include QUEUE_DATABASE_NAME for PostgreSQL driver
	rawEnv['QUEUE_DATABASE_NAME'] = process.env['QUEUE_DATABASE_NAME'];

	return parseEnv(rawEnv);
};

export default env;
