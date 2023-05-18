import { LoggerWrapper } from '@joplin/lib/Logger';
import { StripePublicConfig } from '@joplin/lib/utils/joplinCloud';
import * as Koa from 'koa';
import { User, Uuid } from '../services/database/types';
import { Models } from '../models/factory';
import { Account } from '../models/UserModel';
import { Services } from '../services/types';
import { Routers } from './routeUtils';
import { DbConnection } from '../db';
import { EnvVariables, MailerSecurity } from '../env';

export enum Env {
	Dev = 'dev',
	Prod = 'prod',
	BuildTypes = 'buildTypes',
}

export interface NotificationView {
	id: Uuid;
	messageHtml: string;
	levelClassName: string;
	closeUrl: string;
}

interface AppContextJoplin {
	env: Env;
	db: DbConnection;
	models: Models;
	appLogger(): LoggerWrapper;
	notifications: NotificationView[];
	owner: User;
	account: Account;
	routes: Routers;
	services: Services;
}

export interface AppContext extends Koa.Context {
	joplin: AppContextJoplin;

	// All the properties under `joplin` were previously at the root, so to make
	// sure they are no longer used anywhere we set them to "never", as that
	// would trigger the TypeScript compiler. Later on, all this can be removed.
	// env: never;
	// db: never;
	// models: never;
	// appLogger: never;
	// notifications: never;
	// owner: never;
	// routes: never;
	// services: never;
}

export enum DatabaseConfigClient {
	Null = 'null',
	PostgreSQL = 'pg',
	SQLite = 'sqlite3',
}

export interface DatabaseConfig {
	client: DatabaseConfigClient;
	// For Postgres, this is the actual database name. For SQLite, this is the
	// path to the SQLite file.
	name: string;
	host?: string;
	port?: number;
	user?: string;
	password?: string;
	connectionString?: string;
	asyncStackTraces?: boolean;
	slowQueryLogEnabled?: boolean;
	slowQueryLogMinDuration?: number;
	autoMigration?: boolean;
}

export interface MailerConfig {
	enabled: boolean;
	host: string;
	port: number;
	security: MailerSecurity;
	authUser: string;
	authPassword: string;
	noReplyName: string;
	noReplyEmail: string;
}

export interface StripeConfig extends StripePublicConfig {
	enabled: boolean;
	secretKey: string;
	webhookSecret: string;
}

export enum StorageDriverType {
	Database = 1,
	Filesystem = 2,
	Memory = 3,
	S3 = 4,
}

// The driver mode is only used by fallback drivers. Regardless of the mode, the
// fallback always work like this:
//
// When reading, first the app checks if the content exists on the main driver.
// If it does it returns this. Otherwise it reads the content from the fallback
// driver.
//
// When writing, the app writes to the main driver. Then the mode determines how
// it writes to the fallback driver:
//
// - In ReadAndClear mode, it's going to clear the fallback driver content. This
//   is used to migrate from one driver to another. It means that over time the
//   old storage will be cleared and all content will be on the new storage.
//
// - In ReadAndWrite mode, it's going to write the content to the fallback
//   driver too. This is purely for safey - it allows deploying the new storage
//   (such as the filesystem or S3) but still keep the old content up-to-date.
//   So if something goes wrong it's possible to go back to the old storage
//   until the new one is working.

export enum StorageDriverMode {
	ReadAndWrite = 1,
	ReadAndClear = 2,
}

export interface StorageDriverConfig {
	type?: StorageDriverType;
	path?: string;
	mode?: StorageDriverMode;
	region?: string;
	accessKeyId?: string;
	secretAccessKeyId?: string;
	bucket?: string;
}

export interface Config extends EnvVariables {
	appVersion: string;
	joplinServerVersion: string; // May be different from appVersion, if this is a fork of JS
	appName: string;
	env: Env;
	port: number;
	rootDir: string;
	viewDir: string;
	layoutDir: string;
	// Note that, for now, nothing is being logged to file. Log is just printed
	// to stdout, which is then handled by Docker own log mechanism
	logDir: string;
	tempDir: string;
	baseUrl: string;
	apiBaseUrl: string;
	adminBaseUrl: string;
	userContentBaseUrl: string;
	joplinAppBaseUrl: string;
	signupEnabled: boolean;
	termsEnabled: boolean;
	accountTypesEnabled: boolean;
	showErrorStackTraces: boolean;
	database: DatabaseConfig;
	mailer: MailerConfig;
	stripe: StripeConfig;
	supportEmail: string;
	supportName: string;
	businessEmail: string;
	isJoplinCloud: boolean;
	cookieSecure: boolean;
	storageDriver: StorageDriverConfig;
	storageDriverFallback: StorageDriverConfig;
	itemSizeHardLimit: number;
	maxTimeDrift: number;
}

export enum HttpMethod {
	GET = 'GET',
	POST = 'POST',
	DELETE = 'DELETE',
	PATCH = 'PATCH',
	HEAD = 'HEAD',
}

export enum RouteType {
	Web = 1,
	Api = 2,
	UserContent = 3,
}

export type KoaNext = ()=> Promise<void>;

export interface CommandContext {
	models: Models;
}
