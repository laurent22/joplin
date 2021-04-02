import { LoggerWrapper } from '@joplin/lib/Logger';
import config from '../config';
import { DbConnection } from '../db';
import newModelFactory, { Models } from '../models/factory';
import Applications from '../services/Applications';
import { AppContext, Env } from './types';
import routes from '../routes/routes';
import ShareService from '../services/ShareService';
import { Services } from '../services/types';

function setupServices(models: Models): Services {
	return {
		share: new ShareService(models),
	};
}

export default async function(appContext: AppContext, env: Env, dbConnection: DbConnection, appLogger: ()=> LoggerWrapper) {
	appContext.env = env;
	appContext.db = dbConnection;
	appContext.models = newModelFactory(appContext.db, config().baseUrl);
	appContext.apps = new Applications(appContext.models);
	appContext.services = setupServices(appContext.models);
	await appContext.apps.initializeApps();
	appContext.appLogger = appLogger;
	appContext.routes = routes;
}
