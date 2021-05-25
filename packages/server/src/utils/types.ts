import { LoggerWrapper } from '@joplin/lib/Logger';
import * as Koa from 'koa';
import { DbConnection, User, Uuid } from '../db';
import { Models } from '../models/factory';
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

export interface AppContext extends Koa.Context {
	env: Env;
	db: DbConnection;
	models: Models;
	appLogger(): LoggerWrapper;
	notifications: NotificationView[];
	owner: User;
	routes: Routers;
	services: Services;
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

export interface Config {
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
	database: DatabaseConfig;
	mailer: MailerConfig;
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
