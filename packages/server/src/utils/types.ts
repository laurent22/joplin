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

export interface DatabaseConfig {
	client: string;
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
	logDir: string;
	database: DatabaseConfig;
}

export type KoaNext = ()=> Promise<void>;
