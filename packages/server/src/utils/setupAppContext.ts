import { LoggerWrapper } from '@joplin/lib/Logger';
import config from '../config';
import { DbConnection } from '../db';
import newModelFactory, { Models } from '../models/factory';
import { AppContext, Config, Env } from './types';
import routes from '../routes/routes';
import ShareService from '../services/ShareService';
import { Services } from '../services/types';
import EmailService from '../services/EmailService';
import CronService from '../services/CronService';
import MustacheService from '../services/MustacheService';

async function setupServices(env: Env, models: Models, config: Config): Promise<Services> {
	const output: Services = {
		share: new ShareService(env, models, config),
		email: new EmailService(env, models, config),
		cron: new CronService(env, models, config),
		mustache: new MustacheService(config.viewDir, config.baseUrl),
	};

	await output.mustache.loadPartials();

	return output;
}

export default async function(appContext: AppContext, env: Env, dbConnection: DbConnection, appLogger: ()=> LoggerWrapper): Promise<AppContext> {
	appContext.env = env;
	appContext.db = dbConnection;
	appContext.models = newModelFactory(appContext.db, config());
	appContext.services = await setupServices(env, appContext.models, config());
	appContext.appLogger = appLogger;
	appContext.routes = { ...routes };

	if (env === Env.Prod) delete appContext.routes['api/debug'];

	return appContext;
}
