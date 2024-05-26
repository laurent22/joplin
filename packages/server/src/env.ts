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
	USERS_WITH_REPLICATION: '', // Temporary
	HEARTBEAT_MESSAGE_SCHEDULE: '* * * * *',

	// The admin panel is accessible only if this is an admin instance.
	// Additionally, processing services (those defined in setupTaskService.ts)
	// only run on the admin instance.
	IS_ADMIN_INSTANCE: true,
	INSTANCE_NAME: '',

	// Maxiumm allowed drift between NTP time and server time. A few
	// milliseconds is normally not an issue unless many clients are modifying
	// the same note at the exact same time. But past a certain limit, it might
	// mean the server clock is incorrect and should be fixed, as that could
	// result in clients generating many conflicts. Set to 0 to disable the
	// check. https://github.com/laurent22/joplin/issues/5738

	MAX_TIME_DRIFT: 2000,
	NTP_SERVER: 'pool.ntp.org:123',

	DELTA_INCLUDES_ITEMS: true,

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
	DB_ALLOW_INCOMPLETE_MIGRATIONS: false,
	DB_USE_SLAVE: false,

	POSTGRES_PASSWORD: 'joplin',
	POSTGRES_DATABASE: 'joplin',
	POSTGRES_USER: 'joplin',
	POSTGRES_HOST: '',
	POSTGRES_PORT: 5432,
	POSTGRES_CONNECTION_STRING: '',

	SLAVE_POSTGRES_PASSWORD: 'joplin',
	SLAVE_POSTGRES_DATABASE: 'joplin',
	SLAVE_POSTGRES_USER: 'joplin',
	SLAVE_POSTGRES_HOST: '',
	SLAVE_POSTGRES_PORT: 5432,
	SLAVE_POSTGRES_CONNECTION_STRING: '',

	// This must be the full path to the database file
	SQLITE_DATABASE: '',
	SLAVE_SQLITE_DATABASE: '',

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

	// ==================================================
	// LDAP configuration
	// ==================================================

	LDAP_1_ENABLED: false,
	LDAP_1_USER_AUTO_CREATION: true, // if set to true, users will be created on the fly with data from ldap
	LDAP_1_HOST: '', // ldap server in following format ldap(s)://servername:port
	LDAP_1_MAIL_ATTRIBUTE: 'mail',
	LDAP_1_FULLNAME_ATTRIBUTE: 'displayName',
	LDAP_1_BASE_DN: '',
	LDAP_1_BIND_DN: '', // used for user search - leave empty if ldap server allows anonymous bind
	LDAP_1_BIND_PW: '', // used for user search - leave empty if ldap server allows anonymous bind

	LDAP_2_ENABLED: false,
	LDAP_2_USER_AUTO_CREATION: true, // if set to true, users will be created on the fly after ldap authentication
	LDAP_2_HOST: '', // ldap server in following format ldap(s)://servername:port
	LDAP_2_MAIL_ATTRIBUTE: 'mail',
	LDAP_2_FULLNAME_ATTRIBUTE: 'fullName',
	LDAP_2_BASE_DN: '',
	LDAP_2_BIND_DN: '', // used for user search - leave empty if ldap server allows anonymous bind
	LDAP_2_BIND_PW: '', // used for user search - leave empty if ldap server allows anonymous bind

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
	USERS_WITH_REPLICATION: string;
	HEARTBEAT_MESSAGE_SCHEDULE: string;

	MAX_TIME_DRIFT: number;
	NTP_SERVER: string;
	DELTA_INCLUDES_ITEMS: boolean;
	IS_ADMIN_INSTANCE: boolean;
	INSTANCE_NAME: string;

	APP_BASE_URL: string;
	USER_CONTENT_BASE_URL: string;
	API_BASE_URL: string;
	JOPLINAPP_BASE_URL: string;

	DB_CLIENT: string;
	DB_SLOW_QUERY_LOG_ENABLED: boolean;
	DB_SLOW_QUERY_LOG_MIN_DURATION: number;
	DB_AUTO_MIGRATION: boolean;
	DB_ALLOW_INCOMPLETE_MIGRATIONS: boolean;
	DB_USE_SLAVE: boolean;

	POSTGRES_PASSWORD: string;
	POSTGRES_DATABASE: string;
	POSTGRES_USER: string;
	POSTGRES_HOST: string;
	POSTGRES_PORT: number;
	POSTGRES_CONNECTION_STRING: string;

	SLAVE_POSTGRES_PASSWORD: string;
	SLAVE_POSTGRES_DATABASE: string;
	SLAVE_POSTGRES_USER: string;
	SLAVE_POSTGRES_HOST: string;
	SLAVE_POSTGRES_PORT: number;
	SLAVE_POSTGRES_CONNECTION_STRING: string;

	SQLITE_DATABASE: string;
	SLAVE_SQLITE_DATABASE: string;

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

	LDAP_1_ENABLED: boolean;
	LDAP_1_USER_AUTO_CREATION: boolean;
	LDAP_1_HOST: string;
	LDAP_1_MAIL_ATTRIBUTE: string;
	LDAP_1_FULLNAME_ATTRIBUTE: string;
	LDAP_1_BASE_DN: string;
	LDAP_1_BIND_DN: string;
	LDAP_1_BIND_PW: string;

	LDAP_2_ENABLED: boolean;
	LDAP_2_USER_AUTO_CREATION: boolean;
	LDAP_2_HOST: string;
	LDAP_2_MAIL_ATTRIBUTE: string;
	LDAP_2_FULLNAME_ATTRIBUTE: string;
	LDAP_2_BASE_DN: string;
	LDAP_2_BIND_DN: string;
	LDAP_2_BIND_PW: string;
}

const parseBoolean = (s: string): boolean => {
	if (s === 'true' || s === '1') return true;
	if (s === 'false' || s === '0') return false;
	throw new Error(`Invalid boolean value: "${s}" (Must be one of "true", "false", "0, "1")`);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				(output as any)[key] = v;
			} else if (typeof value === 'boolean') {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				(output as any)[key] = parseBoolean(rawEnvValue);
			} else if (typeof value === 'string') {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
