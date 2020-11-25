import * as Koa from 'koa';
import { Controllers } from '../controllers/factory';
import { DbConnection } from '../db';
import { Models } from '../models/factory';

export interface AppContext extends Koa.Context {
	db: DbConnection;
	models: Models;
	controllers: Controllers;
}
