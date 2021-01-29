import { LoggerWrapper } from '@joplin/lib/Logger';
import config from '../config';
import { DbConnection } from '../db';
import newModelFactory from '../models/factory';
import Applications from '../services/Applications';
import { AppContext, Env } from './types';

export default async function(appContext: AppContext, env: Env, dbConnection: DbConnection, appLogger: ()=> LoggerWrapper) {
	appContext.env = env;
	appContext.db = dbConnection;
	appContext.models = newModelFactory(appContext.db, config().baseUrl);
	appContext.apps = new Applications(appContext.models);
	appContext.appLogger = appLogger;
}
