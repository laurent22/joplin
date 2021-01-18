import { LoggerWrapper } from '@joplin/lib/Logger';
import * as Koa from 'koa';
import { DbConnection, User, Uuid } from '../db';
import { Models } from '../models/factory';

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
}

export enum DatabaseConfigClient {
	PostgreSQL = 'pg',
	SQLite = 'sqlite3',
}

export interface DatabaseConfig {
	client: DatabaseConfigClient;
	name: string;
	host?: string;
	port?: number;
	user?: string;
	password?: string;
	asyncStackTraces?: boolean;
}

export interface Config {
	port: number;
	rootDir: string;
	viewDir: string;
	layoutDir: string;
	// Not that, for now, nothing is being logged to file. Log is just printed
	// to stdout, which is then handled by Docker own log mechanism
	logDir: string;
	database: DatabaseConfig;
	baseUrl: string;
}

export enum HttpMethod {
	GET = 'GET',
	POST = 'POST',
	DELETE = 'DELETE',
	PATCH = 'PATCH',
	HEAD = 'HEAD',
}

export type KoaNext = ()=> Promise<void>;
