export interface EnvVariables {
	// ==================================================
	// General config
	// ==================================================

	APP_NAME: string;
	APP_PORT: number;
	SIGNUP_ENABLED: boolean;
	TERMS_ENABLED: boolean;
	ACCOUNT_TYPES_ENABLED: boolean;
	ERROR_STACK_TRACES: boolean;
	COOKIES_SECURE: boolean;
	RUNNING_IN_DOCKER: boolean;

	// ==================================================
	// URL config
	// ==================================================

	APP_BASE_URL: string;
	USER_CONTENT_BASE_URL: string;
	API_BASE_URL: string;
	JOPLINAPP_BASE_URL: string;

	// ==================================================
	// Database config
	// ==================================================

	DB_CLIENT: string;
	DB_SLOW_QUERY_LOG_ENABLED: boolean;
	DB_SLOW_QUERY_LOG_MIN_DURATION: number;
	DB_AUTO_MIGRATION: boolean;

	POSTGRES_PASSWORD: string;
	POSTGRES_DATABASE: string;
	POSTGRES_USER: string;
	POSTGRES_HOST: string;
	POSTGRES_PORT: number;

	// This must be the full path to the database file
	SQLITE_DATABASE: string;

	// ==================================================
	// Mailer config
	// ==================================================

	MAILER_ENABLED: boolean;
	MAILER_HOST: string;
	MAILER_PORT: number;
	MAILER_SECURE: boolean;
	MAILER_AUTH_USER: string;
	MAILER_AUTH_PASSWORD: string;
	MAILER_NOREPLY_NAME: string;
	MAILER_NOREPLY_EMAIL: string;

	SUPPORT_EMAIL: string;
	SUPPORT_NAME: string;
	BUSINESS_EMAIL: string;

	// ==================================================
	// Stripe config
	// ==================================================

	STRIPE_SECRET_KEY: string;
	STRIPE_WEBHOOK_SECRET: string;
}

const defaultEnvValues: EnvVariables = {
	APP_NAME: 'Joplin Server',
	APP_PORT: 22300,
	SIGNUP_ENABLED: false,
	TERMS_ENABLED: false,
	ACCOUNT_TYPES_ENABLED: false,
	ERROR_STACK_TRACES: false,
	COOKIES_SECURE: false,
	RUNNING_IN_DOCKER: false,

	APP_BASE_URL: '',
	USER_CONTENT_BASE_URL: '',
	API_BASE_URL: '',
	JOPLINAPP_BASE_URL: 'https://joplinapp.org',

	DB_CLIENT: 'sqlite3',
	DB_SLOW_QUERY_LOG_ENABLED: false,
	DB_SLOW_QUERY_LOG_MIN_DURATION: 1000,
	DB_AUTO_MIGRATION: true,

	POSTGRES_PASSWORD: 'joplin',
	POSTGRES_DATABASE: 'joplin',
	POSTGRES_USER: 'joplin',
	POSTGRES_HOST: '',
	POSTGRES_PORT: 5432,

	SQLITE_DATABASE: '',

	MAILER_ENABLED: false,
	MAILER_HOST: '',
	MAILER_PORT: 587,
	MAILER_SECURE: true,
	MAILER_AUTH_USER: '',
	MAILER_AUTH_PASSWORD: '',
	MAILER_NOREPLY_NAME: '',
	MAILER_NOREPLY_EMAIL: '',

	SUPPORT_EMAIL: 'SUPPORT_EMAIL', // Defaults to "SUPPORT_EMAIL" so that server admin knows they have to set it.
	SUPPORT_NAME: '',
	BUSINESS_EMAIL: '',

	STRIPE_SECRET_KEY: '',
	STRIPE_WEBHOOK_SECRET: '',
};

export function parseEnv(rawEnv: any, defaultOverrides: any = null): EnvVariables {
	const output: EnvVariables = {
		...defaultEnvValues,
		...defaultOverrides,
	};

	for (const [key, value] of Object.entries(defaultEnvValues)) {
		const rawEnvValue = rawEnv[key];

		if (rawEnvValue === undefined) continue;

		if (typeof value === 'number') {
			const v = Number(rawEnvValue);
			if (isNaN(v)) throw new Error(`Invalid number value for env variable ${key} = ${rawEnvValue}`);
			(output as any)[key] = v;
		} else if (typeof value === 'boolean') {
			if (rawEnvValue !== '0' && rawEnvValue !== '1') throw new Error(`Invalid boolean for for env variable ${key}: ${rawEnvValue}`);
			(output as any)[key] = rawEnvValue === '1';
		} else if (typeof value === 'string') {
			(output as any)[key] = `${rawEnvValue}`;
		} else {
			throw new Error(`Invalid env default value type: ${typeof value}`);
		}
	}

	return output;
}
