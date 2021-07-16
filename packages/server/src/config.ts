import { rtrimSlashes } from '@joplin/lib/path-utils';
import { Config, DatabaseConfig, DatabaseConfigClient, Env, MailerConfig, RouteType, StripeConfig, StripePublicConfig } from './utils/types';
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
	STRIPE_WEBHOOK_SECRET?: string;

	SIGNUP_ENABLED?: string;
	TERMS_ENABLED?: string;
	ACCOUNT_TYPES_ENABLED?: string;

	ERROR_STACK_TRACES?: string;

	SUPPORT_EMAIL?: string;
	BUSINESS_EMAIL?: string;
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

function databaseConfigFromEnv(runningInDocker: boolean, env: EnvVariables): DatabaseConfig {
	if (env.DB_CLIENT === 'pg') {
		return {
			client: DatabaseConfigClient.PostgreSQL,
			name: env.POSTGRES_DATABASE || 'joplin',
			user: env.POSTGRES_USER || 'joplin',
			password: env.POSTGRES_PASSWORD || 'joplin',
			port: env.POSTGRES_PORT ? Number(env.POSTGRES_PORT) : 5432,
			host: databaseHostFromEnv(runningInDocker, env) || 'localhost',
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

function stripeConfigFromEnv(publicConfig: StripePublicConfig, env: EnvVariables): StripeConfig {
	return {
		...publicConfig,
		secretKey: env.STRIPE_SECRET_KEY || '',
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
	const stripePublicConfigs = JSON.parse(await readFile(`${rootDir}/stripeConfig.json`, 'utf8'));
	const stripePublicConfig = stripePublicConfigs[envType];
	if (!stripePublicConfig) throw new Error('Could not load Stripe config');

	const viewDir = `${rootDir}/src/views`;
	const appPort = env.APP_PORT ? Number(env.APP_PORT) : 22300;
	const baseUrl = baseUrlFromEnv(env, appPort);
	const supportEmail = env.SUPPORT_EMAIL || 'admin@localhost';

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
		stripe: stripeConfigFromEnv(stripePublicConfig, env),
		port: appPort,
		baseUrl,
		showErrorStackTraces: (env.ERROR_STACK_TRACES === undefined && envType === Env.Dev) || env.ERROR_STACK_TRACES === '1',
		apiBaseUrl: env.API_BASE_URL ? env.API_BASE_URL : baseUrl,
		userContentBaseUrl: env.USER_CONTENT_BASE_URL ? env.USER_CONTENT_BASE_URL : baseUrl,
		signupEnabled: env.SIGNUP_ENABLED === '1',
		termsEnabled: env.TERMS_ENABLED === '1',
		accountTypesEnabled: env.ACCOUNT_TYPES_ENABLED === '1',
		supportEmail,
		businessEmail: env.BUSINESS_EMAIL || supportEmail,
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
