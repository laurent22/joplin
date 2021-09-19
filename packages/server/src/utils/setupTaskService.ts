import { Models } from '../models/factory';
import TaskService, { Task } from '../services/TaskService';
import { Config, Env } from './types';

export default function(env: Env, models: Models, config: Config): TaskService {
	const taskService = new TaskService(env, models, config);

	let tasks: Task[] = [
		{
			id: 'deleteExpiredTokens',
			description: 'Delete expired tokens',
			schedule: '0 */6 * * *',
			run: (models: Models) => models.token().deleteExpiredTokens(),
		},
		{
			id: 'updateTotalSizes',
			description: 'Update total sizes',
			schedule: '0 * * * *',
			run: (models: Models) => models.item().updateTotalSizes(),
		},
		{
			id: 'handleOversizedAccounts',
			description: 'Process oversized accounts',
			schedule: '0 14 * * *',
			run: (models: Models) => models.user().handleOversizedAccounts(),
		},
	];

	if (config.isJoplinCloud) {
		tasks = tasks.concat([
			{
				id: 'handleBetaUserEmails',
				description: 'Process beta user emails',
				schedule: '0 12 * * *',
				run: (models: Models) => models.user().handleBetaUserEmails(),
			},
			{
				id: 'handleFailedPaymentSubscriptions',
				description: 'Process failed payment subscriptions',
				schedule: '0 13 * * *',
				run: (models: Models) => models.user().handleFailedPaymentSubscriptions(),
			},
		]);
	}

	taskService.registerTasks(tasks);

	return taskService;
}
