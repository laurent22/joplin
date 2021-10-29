import { Models } from '../models/factory';
import TaskService, { Task, TaskId } from '../services/TaskService';
import { Config, Env } from './types';

export default function(env: Env, models: Models, config: Config): TaskService {
	const taskService = new TaskService(env, models, config);

	let tasks: Task[] = [
		{
			id: TaskId.DeleteExpiredTokens,
			description: 'Delete expired tokens',
			schedule: '0 */6 * * *',
			run: (models: Models) => models.token().deleteExpiredTokens(),
		},
		{
			id: TaskId.UpdateTotalSizes,
			description: 'Update total sizes',
			schedule: '0 * * * *',
			run: (models: Models) => models.item().updateTotalSizes(),
		},

		// Need to do it relatively frequently so that if the user fixes
		// whatever was causing the oversized account, they can get it
		// re-enabled quickly. Also it's done on minute 30 because it depends on
		// the UpdateTotalSizes task being run.
		{
			id: TaskId.HandleOversizedAccounts,
			description: 'Process oversized accounts',
			schedule: '0 */2 30 * *',
			run: (models: Models) => models.user().handleOversizedAccounts(),
		},

		// {
		// 	id: TaskId.DeleteExpiredSessions,
		// 	description: 'Delete expired sessions',
		// 	schedule: '0 */6 * * *',
		// 	run: (models: Models) => models.session().deleteExpiredSessions(),
		// },
	];

	if (config.isJoplinCloud) {
		tasks = tasks.concat([
			{
				id: TaskId.HandleBetaUserEmails,
				description: 'Process beta user emails',
				schedule: '0 12 * * *',
				run: (models: Models) => models.user().handleBetaUserEmails(),
			},
			{
				id: TaskId.HandleFailedPaymentSubscriptions,
				description: 'Process failed payment subscriptions',
				schedule: '0 13 * * *',
				run: (models: Models) => models.user().handleFailedPaymentSubscriptions(),
			},
		]);
	}

	taskService.registerTasks(tasks);

	return taskService;
}
