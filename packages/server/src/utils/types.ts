import { LoggerWrapper } from '@joplin/lib/Logger';
import * as Koa from 'koa';
import { DbConnection, User, Uuid } from '../db';
import { Models } from '../models/factory';
import { Account } from '../models/UserModel';
import { Services } from '../services/types';
import { Routers } from './routeUtils';

export enum Env {
	Dev = 'dev',
	Prod = 'prod',
	BuildTypes = 'buildTypes',
}

export interface NotificationView {
	id: Uuid;
	messageHtml: string;
	level: string;
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
	env: never;
	db: never;
	models: never;
	appLogger: never;
	notifications: never;
	owner: never;
	routes: never;
	services: never;
}

export enum DatabaseConfigClient {
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
	asyncStackTraces?: boolean;
}

export interface MailerConfig {
	enabled: boolean;
	host: string;
	port: number;
	secure: boolean;
	authUser: string;
	authPassword: string;
	noReplyName: string;
	noReplyEmail: string;
}

export interface StripePublicConfig {
	publishableKey: string;
	basicPriceId: string;
	proPriceId: string;
	webhookBaseUrl: string;
}

export interface StripeConfig extends StripePublicConfig {
	secretKey: string;
	webhookSecret: string;
}

export interface Config {
	appVersion: string;
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
	userContentBaseUrl: string;
	signupEnabled: boolean;
	termsEnabled: boolean;
	accountTypesEnabled: boolean;
	showErrorStackTraces: boolean;
	database: DatabaseConfig;
	mailer: MailerConfig;
	stripe: StripeConfig;
	supportEmail: string;
	businessEmail: string;
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
