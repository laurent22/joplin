// The possible env variables and their defaults are listed below.
//
// The env variables can be of type string, integer or boolean. When the type is
// boolean, set the variable to "true", "false", "0" or "1" in your env file.

export enum MailerSecurity {
	None = 'none',
	Tls = 'tls',
	Starttls = 'starttls',
}

const defaultEnvValues: EnvVariables = {
	// ==================================================
	// General config
	// ==================================================

	APP_NAME: 'Joplin Server',
	APP_PORT: 22300,
	SIGNUP_ENABLED: false,
	TERMS_ENABLED: false,
	ACCOUNT_TYPES_ENABLED: false,
	ERROR_STACK_TRACES: false,
	COOKIES_SECURE: false,
	RUNNING_IN_DOCKER: false,

	// Maxiumm allowed drift between NTP time and server time. A few
	// milliseconds is normally not an issue unless many clients are modifying
	// the same note at the exact same time. But past a certain limit, it might
	// mean the server clock is incorrect and should be fixed, as that could
	// result in clients generating many conflicts. Set to 0 to disable the
	// check. https://github.com/laurent22/joplin/issues/5738

	MAX_TIME_DRIFT: 2000,
	NTP_SERVER: 'pool.ntp.org:123',

	// ==================================================
	// URL config
	// ==================================================

	APP_BASE_URL: '',
	USER_CONTENT_BASE_URL: '',
	API_BASE_URL: '',
	JOPLINAPP_BASE_URL: 'https://joplinapp.org',

	// ==================================================
	// Database config
	// ==================================================

	DB_CLIENT: 'sqlite3',
	DB_SLOW_QUERY_LOG_ENABLED: false,
	DB_SLOW_QUERY_LOG_MIN_DURATION: 1000,
	DB_AUTO_MIGRATION: true,

	POSTGRES_PASSWORD: 'joplin',
	POSTGRES_DATABASE: 'joplin',
	POSTGRES_USER: 'joplin',
	POSTGRES_HOST: '',
	POSTGRES_PORT: 5432,
	POSTGRES_CONNECTION_STRING: '',

	// This must be the full path to the database file
	SQLITE_DATABASE: '',

	// ==================================================
	// Content driver config
	// ==================================================

	STORAGE_DRIVER: 'Type=Database',
	STORAGE_DRIVER_FALLBACK: '',

	// ==================================================
	// Mailer config
	// ==================================================

	MAILER_ENABLED: false,
	MAILER_HOST: '',
	MAILER_PORT: 465,
	MAILER_SECURITY: MailerSecurity.Tls,
	MAILER_AUTH_USER: '',
	MAILER_AUTH_PASSWORD: '',
	MAILER_NOREPLY_NAME: '',
	MAILER_NOREPLY_EMAIL: '',

	SUPPORT_EMAIL: 'SUPPORT_EMAIL', // Defaults to "SUPPORT_EMAIL" so that server admin knows they have to set it.
	SUPPORT_NAME: '',
	BUSINESS_EMAIL: '',

	// ==================================================
	// Stripe config
	// ==================================================

	STRIPE_SECRET_KEY: '',
	STRIPE_WEBHOOK_SECRET: '',

	// ==================================================
	// User data deletion
	// ==================================================

	USER_DATA_AUTO_DELETE_ENABLED: false,
	USER_DATA_AUTO_DELETE_AFTER_DAYS: 90,
};

export interface EnvVariables {
	APP_NAME: string;
	APP_PORT: number;
	SIGNUP_ENABLED: boolean;
	TERMS_ENABLED: boolean;
	ACCOUNT_TYPES_ENABLED: boolean;
	ERROR_STACK_TRACES: boolean;
	COOKIES_SECURE: boolean;
	RUNNING_IN_DOCKER: boolean;
	MAX_TIME_DRIFT: number;
	NTP_SERVER: string;

	APP_BASE_URL: string;
	USER_CONTENT_BASE_URL: string;
	API_BASE_URL: string;
	JOPLINAPP_BASE_URL: string;

	DB_CLIENT: string;
	DB_SLOW_QUERY_LOG_ENABLED: boolean;
	DB_SLOW_QUERY_LOG_MIN_DURATION: number;
	DB_AUTO_MIGRATION: boolean;

	POSTGRES_PASSWORD: string;
	POSTGRES_DATABASE: string;
	POSTGRES_USER: string;
	POSTGRES_HOST: string;
	POSTGRES_PORT: number;
	POSTGRES_CONNECTION_STRING: string;

	SQLITE_DATABASE: string;

	STORAGE_DRIVER: string;
	STORAGE_DRIVER_FALLBACK: string;

	MAILER_ENABLED: boolean;
	MAILER_HOST: string;
	MAILER_PORT: number;
	MAILER_SECURITY: MailerSecurity;
	MAILER_AUTH_USER: string;
	MAILER_AUTH_PASSWORD: string;
	MAILER_NOREPLY_NAME: string;
	MAILER_NOREPLY_EMAIL: string;

	SUPPORT_EMAIL: string;
	SUPPORT_NAME: string;
	BUSINESS_EMAIL: string;

	STRIPE_SECRET_KEY: string;
	STRIPE_WEBHOOK_SECRET: string;

	USER_DATA_AUTO_DELETE_ENABLED: boolean;
	USER_DATA_AUTO_DELETE_AFTER_DAYS: number;
}

const parseBoolean = (s: string): boolean => {
	if (s === 'true' || s === '1') return true;
	if (s === 'false' || s === '0') return false;
	throw new Error(`Invalid boolean value: "${s}" (Must be one of "true", "false", "0, "1")`);
};

export function parseEnv(rawEnv: Record<string, string>, defaultOverrides: any = null): EnvVariables {
	const output: EnvVariables = {
		...defaultEnvValues,
		...defaultOverrides,
	};

	for (const [key, value] of Object.entries(defaultEnvValues)) {
		const rawEnvValue = rawEnv[key];

		if (rawEnvValue === undefined) continue;

		try {
			if (typeof value === 'number') {
				const v = Number(rawEnvValue);
				if (isNaN(v)) throw new Error(`Invalid number value "${rawEnvValue}"`);
				(output as any)[key] = v;
			} else if (typeof value === 'boolean') {
				(output as any)[key] = parseBoolean(rawEnvValue);
			} else if (typeof value === 'string') {
				(output as any)[key] = `${rawEnvValue}`;
			} else {
				throw new Error(`Invalid env default value type: ${typeof value}`);
			}
		} catch (error) {
			error.message = `Could not parse key "${key}": ${error.message}`;
			throw error;
		}
	}

	return output;
}
