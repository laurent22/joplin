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
import TaskService from '../services/TaskService';

function setupTaskService(env: Env, models: Models, config: Config): TaskService {
	const taskService = new TaskService(env, models, config);

	taskService.registerTasks([
		{
			id: 'deleteExpiredTokens',
			description: 'Delete expired tokens',
			run: (models: Models) => models.token().deleteExpiredTokens(),
		},
		{
			id: 'updateTotalSizes',
			description: 'Update total sizes',
			run: (models: Models) => models.item().updateTotalSizes(),
		},
		{
			id: 'handleBetaUserEmails',
			description: 'Process beta user emails',
			run: (models: Models) => models.user().handleBetaUserEmails(),
		},
		{
			id: 'handleFailedPaymentSubscriptions',
			description: 'Process failed payment subscriptions',
			run: (models: Models) => models.user().handleFailedPaymentSubscriptions(),
		},
		{
			id: 'handleOversizedAccounts',
			description: 'Process oversized accounts',
			run: (models: Models) => models.user().handleOversizedAccounts(),
		},
	]);

	return taskService;
}

async function setupServices(env: Env, models: Models, config: Config): Promise<Services> {
	const taskService = setupTaskService(env, models, config);

	const output: Services = {
		share: new ShareService(env, models, config),
		email: new EmailService(env, models, config),
		cron: new CronService(env, models, config, taskService),
		mustache: new MustacheService(config.viewDir, config.baseUrl),
		tasks: taskService,
	};

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
