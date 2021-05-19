import { LoggerWrapper } from '@joplin/lib/Logger';
import config from '../config';
import { DbConnection } from '../db';
import newModelFactory, { Models } from '../models/factory';
import { AppContext, Config, Env } from './types';
import routes from '../routes/routes';
import ShareService from '../services/ShareService';
import { Services } from '../services/types';
import EmailService from '../services/EmailService';

function setupServices(env: Env, models: Models, config:Config): Services {
	return {
		share: new ShareService(env, models, config),
		email: new EmailService(env, models, config),
	};
}

export default async function(appContext: AppContext, env: Env, dbConnection: DbConnection, appLogger: ()=> LoggerWrapper) {
	appContext.env = env;
	appContext.db = dbConnection;
	appContext.models = newModelFactory(appContext.db, config().baseUrl);
	appContext.services = setupServices(env, appContext.models, config());
	appContext.appLogger = appLogger;
	appContext.routes = { ...routes };

	if (env === Env.Prod) delete appContext.routes['api/debug'];
}
