import { rtrimSlashes } from '@joplin/lib/path-utils';
import { Config, DatabaseConfig, DatabaseConfigClient, Env, MailerConfig, RouteType, StripeConfig } from './utils/types';
import * as pathUtils from 'path';
import { readFile } from 'fs-extra';

export interface EnvVariables {

	APP_NAME?: string;

	APP_BASE_URL?: string;
	USER_CONTENT_BASE_URL?: string;
	API_BASE_URL?: string;

	APP_PORT?: string;
	DB_CLIENT?: string;
	RUNNING_IN_DOCKER?: string;

	POSTGRES_PASSWORD?: string;
	POSTGRES_DATABASE?: string;
	POSTGRES_USER?: string;
	POSTGRES_HOST?: string;
	POSTGRES_PORT?: string;
	POSTGRES_CONNECTION_STRING?: string;
	POSTGRES_SSL_REJECT_UNAUTHORIZED?: string;
	POSTGRES_SSL_CA_FILE?: string;
	POSTGRES_SSL_CERT_FILE?: string;
	POSTGRES_SSL_CERT_KEY_FILE?: string;

	MAILER_ENABLED?: string;
	MAILER_HOST?: string;
	MAILER_PORT?: string;
	MAILER_SECURE?: string;
	MAILER_AUTH_USER?: string;
	MAILER_AUTH_PASSWORD?: string;
	MAILER_NOREPLY_NAME?: string;
	MAILER_NOREPLY_EMAIL?: string;

	// This must be the full path to the database file
	SQLITE_DATABASE?: string;

	STRIPE_SECRET_KEY?: string;
	STRIPE_PUBLISHABLE_KEY?: string;
	STRIPE_WEBHOOK_SECRET?: string;

	SIGNUP_ENABLED?: string;
	TERMS_ENABLED?: string;
	ACCOUNT_TYPES_ENABLED?: string;

	ERROR_STACK_TRACES?: string;
}

let runningInDocker_: boolean = false;

export function runningInDocker(): boolean {
	return runningInDocker_;
}

function databaseHostFromEnv(runningInDocker: boolean, env: EnvVariables): string {
	if (env.POSTGRES_HOST) {
		// When running within Docker, the app localhost is different from the
		// host's localhost. To access the latter, Docker defines a special host
		// called "host.docker.internal", so here we swap the values if necessary.
		if (runningInDocker && ['localhost', '127.0.0.1'].includes(env.POSTGRES_HOST)) {
			return 'host.docker.internal';
		} else {
			return env.POSTGRES_HOST;
		}
	}

	return null;
}

async function databaseConfigFromEnv(runningInDocker: boolean, env: EnvVariables): Promise<DatabaseConfig> {
	if (env.DB_CLIENT === 'pg') {
		const databaseConfig: DatabaseConfig = {
			client: DatabaseConfigClient.PostgreSQL,
		};

		if (env.POSTGRES_CONNECTION_STRING) {
			databaseConfig.connectionString = env.POSTGRES_CONNECTION_STRING;
		} else {
			databaseConfig.name = env.POSTGRES_DATABASE || 'joplin';
			databaseConfig.user = env.POSTGRES_USER || 'joplin';
			databaseConfig.password = env.POSTGRES_PASSWORD || 'joplin';
			databaseConfig.port = env.POSTGRES_PORT ? Number(env.POSTGRES_PORT) : 5432;
			databaseConfig.host = databaseHostFromEnv(runningInDocker, env) || 'localhost';
		}

		if (env.POSTGRES_SSL_REJECT_UNAUTHORIZED) {
			const rejectUnauthorized = Number(env.POSTGRES_SSL_REJECT_UNAUTHORIZED);
			if (rejectUnauthorized === 0 || rejectUnauthorized === 1) { databaseConfig.sslRejectUnauthorized = rejectUnauthorized === 1; }
		}

		if (env.POSTGRES_SSL_CA_FILE) { databaseConfig.sslCa = env.POSTGRES_SSL_CERT_FILE ? await readFile(env.POSTGRES_SSL_CA_FILE, 'utf8') : null; }

		if (env.POSTGRES_SSL_CERT_FILE && env.POSTGRES_SSL_CERT_KEY_FILE) {
			databaseConfig.sslCert = await readFile(env.POSTGRES_SSL_CERT_FILE, 'utf8');
			databaseConfig.sslCertKey = await readFile(env.POSTGRES_SSL_CERT_KEY_FILE, 'utf8');
		}

		return {
			...databaseConfig,
		};
	}

	return {
		client: DatabaseConfigClient.SQLite,
		name: env.SQLITE_DATABASE,
		asyncStackTraces: true,
	};
}

function mailerConfigFromEnv(env: EnvVariables): MailerConfig {
	return {
		enabled: env.MAILER_ENABLED !== '0',
		host: env.MAILER_HOST || '',
		port: Number(env.MAILER_PORT || 587),
		secure: !!Number(env.MAILER_SECURE) || true,
		authUser: env.MAILER_AUTH_USER || '',
		authPassword: env.MAILER_AUTH_PASSWORD || '',
		noReplyName: env.MAILER_NOREPLY_NAME || '',
		noReplyEmail: env.MAILER_NOREPLY_EMAIL || '',
	};
}

function stripeConfigFromEnv(env: EnvVariables): StripeConfig {
	return {
		secretKey: env.STRIPE_SECRET_KEY || '',
		publishableKey: env.STRIPE_PUBLISHABLE_KEY || '',
		webhookSecret: env.STRIPE_WEBHOOK_SECRET || '',
	};
}

function baseUrlFromEnv(env: any, appPort: number): string {
	if (env.APP_BASE_URL) {
		return rtrimSlashes(env.APP_BASE_URL);
	} else {
		return `http://localhost:${appPort}`;
	}
}

interface PackageJson {
	version: string;
}

async function readPackageJson(filePath: string): Promise<PackageJson> {
	const text = await readFile(filePath, 'utf8');
	return JSON.parse(text);
}

let config_: Config = null;

export async function initConfig(envType: Env, env: EnvVariables, overrides: any = null) {
	runningInDocker_ = !!env.RUNNING_IN_DOCKER;

	const rootDir = pathUtils.dirname(__dirname);

	const packageJson = await readPackageJson(`${rootDir}/package.json`);

	const viewDir = `${rootDir}/src/views`;
	const appPort = env.APP_PORT ? Number(env.APP_PORT) : 22300;
	const baseUrl = baseUrlFromEnv(env, appPort);

	config_ = {
		appVersion: packageJson.version,
		appName: env.APP_NAME || 'Joplin Server',
		env: envType,
		rootDir: rootDir,
		viewDir: viewDir,
		layoutDir: `${viewDir}/layouts`,
		tempDir: `${rootDir}/temp`,
		logDir: `${rootDir}/logs`,
		database: databaseConfigFromEnv(runningInDocker_, env),
		mailer: mailerConfigFromEnv(env),
		stripe: stripeConfigFromEnv(env),
		port: appPort,
		baseUrl,
		showErrorStackTraces: (env.ERROR_STACK_TRACES === undefined && envType === Env.Dev) || env.ERROR_STACK_TRACES === '1',
		apiBaseUrl: env.API_BASE_URL ? env.API_BASE_URL : baseUrl,
		userContentBaseUrl: env.USER_CONTENT_BASE_URL ? env.USER_CONTENT_BASE_URL : baseUrl,
		signupEnabled: env.SIGNUP_ENABLED === '1',
		termsEnabled: env.TERMS_ENABLED === '1',
		accountTypesEnabled: env.ACCOUNT_TYPES_ENABLED === '1',
		...overrides,
	};
}

export function baseUrl(type: RouteType): string {
	if (type === RouteType.Web) return config().baseUrl;
	if (type === RouteType.Api) return config().apiBaseUrl;
	if (type === RouteType.UserContent) return config().userContentBaseUrl;
	throw new Error(`Unknown type: ${type}`);
}

// User content URL is not supported for now so only show the URL if the
// user content is hosted on the same domain. Needs to get cookie working
// across domains to get user content url working.
export function showItemUrls(config: Config): boolean {
	return config.userContentBaseUrl === config.baseUrl;
}

function config(): Config {
	if (!config_) throw new Error('Config has not been initialized!');
	return config_;
}

export default config;
