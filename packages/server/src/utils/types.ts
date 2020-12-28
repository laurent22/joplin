import * as Koa from 'koa';
import { Controllers } from '../controllers/factory';
import { DbConnection } from '../db';
import { Models } from '../models/factory';

export interface AppContext extends Koa.Context {
	db: DbConnection;
	models: Models;
	controllers: Controllers;
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
