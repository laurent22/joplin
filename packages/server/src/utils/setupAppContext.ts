import { LoggerWrapper } from '@joplin/lib/Logger';
import config from '../config';
import { DbConnection } from '../db';
import newModelFactory, { Models } from '../models/factory';
import { AppContext, Config, Env } from './types';
import routes from '../routes/routes';
import ShareService from '../services/ShareService';
import { Services } from '../services/types';
import EmailService from '../services/EmailService';
import MustacheService from '../services/MustacheService';
import setupTaskService from './setupTaskService';
import UserDeletionService from '../services/UserDeletionService';

async function setupServices(env: Env, models: Models, config: Config): Promise<Services> {
	const output: Services = {
		share: new ShareService(env, models, config),
		email: new EmailService(env, models, config),
		mustache: new MustacheService(config.viewDir, config.baseUrl),
		userDeletion: new UserDeletionService(env, models, config),
		tasks: null,
	};

	output.tasks = await setupTaskService(env, models, config, output),

	await output.mustache.loadPartials();

	return output;
}

export default async function(appContext: AppContext, env: Env, dbConnection: DbConnection, appLogger: ()=> LoggerWrapper): Promise<AppContext> {
	const models = newModelFactory(dbConnection, config());

	// The joplinBase object is immutable because it is shared by all requests.
	// Then a "joplin" context property is created from it per request, which
	// contains request-specific properties such as the owner or notifications.
	// See here for the reason:
	// https://github.com/koajs/koa/issues/1554
	appContext.joplinBase = Object.freeze({
		env: env,
		db: dbConnection,
		models: models,
		services: await setupServices(env, models, config()),
		appLogger: appLogger,
		routes: { ...routes },
	});

	if (env === Env.Prod) delete appContext.joplinBase.routes['api/debug'];

	return appContext;
}
