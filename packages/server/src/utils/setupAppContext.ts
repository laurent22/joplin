import { LoggerWrapper } from '@joplin/lib/Logger';
import config from '../config';
import { DbConnection } from '../db';
import newModelFactory, { Models } from '../models/factory';
import { AppContext, Env } from './types';
import routes from '../routes/routes';
import ShareService from '../services/ShareService';
import { Services } from '../services/types';

function setupServices(env: Env, models: Models): Services {
	return {
		share: new ShareService(env, models),
	};
}

export default async function(appContext: AppContext, env: Env, dbConnection: DbConnection, appLogger: ()=> LoggerWrapper) {
	appContext.env = env;
	appContext.db = dbConnection;
	appContext.models = newModelFactory(appContext.db, config().baseUrl);
	appContext.services = setupServices(env, appContext.models);
	appContext.appLogger = appLogger;
	appContext.routes = { ...routes };

	if (env === Env.Prod) delete appContext.routes['api/debug'];
}
