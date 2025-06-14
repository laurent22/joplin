
export const defaultEnvValues: EnvVariables = {
	SERVER_PORT: 4567,
	API_KEY: '',
	QUEUE_TTL: 900000,
	QUEUE_RETRY_COUNT: 2,
	QUEUE_MAINTENANCE_INTERVAL: 60000,
	HTR_CLI_DOCKER_IMAGE: 'joplin/htr-cli:0.0.2',
	HTR_CLI_IMAGES_FOLDER: '/home/js/joplin/packages/transcribe/images',
	QUEUE_DRIVER: 'pg', // 'sqlite'
	QUEUE_DATABASE_PASSWORD: '',
	QUEUE_DATABASE_NAME: '',
	QUEUE_DATABASE_USER: '',
	QUEUE_DATABASE_PORT: 5432,
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
