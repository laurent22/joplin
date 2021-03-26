import { LoggerWrapper } from '@joplin/lib/Logger';
import config from '../config';
import { DbConnection } from '../db';
import newModelFactory from '../models/factory';
import Applications from '../services/Applications';
import { AppContext, Env } from './types';
import routes from '../routes/routes';

export default async function(appContext: AppContext, env: Env, dbConnection: DbConnection, appLogger: ()=> LoggerWrapper) {
	appContext.env = env;
	appContext.db = dbConnection;
	appContext.apps = new Applications(appContext.models);
	appContext.models = newModelFactory(appContext.db, config().baseUrl);
	appContext.appLogger = appLogger;
	appContext.routes = routes;
}
