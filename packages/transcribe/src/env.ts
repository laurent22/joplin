import { Day, Hour, Minute, Second } from '@joplin/utils/time';

export const defaultEnvValues: EnvVariables = {
	SERVER_PORT: 4567,
	API_KEY: '',
	QUEUE_TTL: 15 * Minute,
	QUEUE_RETRY_COUNT: 2,
	QUEUE_MAINTENANCE_INTERVAL: 60 * Second,
	HTR_CLI_DOCKER_IMAGE: 'joplin/htr-cli:latest',
	HTR_CLI_IMAGES_FOLDER: '',
	QUEUE_DRIVER: 'pg', // 'sqlite'
	QUEUE_DATABASE_PASSWORD: '',
	QUEUE_DATABASE_NAME: '',
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
	HTR_CLI_DOCKER_IMAGE: string;
	HTR_CLI_IMAGES_FOLDER: string;
	QUEUE_DRIVER: string;
	QUEUE_DATABASE_PASSWORD: string;
	QUEUE_DATABASE_NAME: string;
	QUEUE_DATABASE_USER: string;
	QUEUE_DATABASE_PORT: number;
	FILE_STORAGE_MAINTENANCE_INTERVAL: number;
	FILE_STORAGE_TTL: number;
	QUEUE_DATABASE_HOST: string;
	IMAGE_MAX_DIMENSION: number;
}

export function parseEnv(rawEnv: Record<string, string | undefined>): EnvVariables {
	const output: EnvVariables = {
		...defaultEnvValues,
	};

	for (const [key, value] of Object.entries(defaultEnvValues)) {
		const rawEnvValue = rawEnv[key];

		if (rawEnvValue === undefined) continue;

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

	return output;
}

// Should always be called after require('dotenv').config()
const env = () => {
	return parseEnv(
		Object.keys(defaultEnvValues)
			.reduce((env: Record<string, string | undefined>, key) => {
				env[key] = process.env[key];
				return env;
			}, {}),
	);

};

export default env;
