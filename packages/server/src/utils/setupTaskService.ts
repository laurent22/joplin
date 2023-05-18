import { Models } from '../models/factory';
import { TaskId } from '../services/database/types';
import TaskService, { Task, taskIdToLabel } from '../services/TaskService';
import { Services } from '../services/types';
import { Config, Env } from './types';

export default async function(env: Env, models: Models, config: Config, services: Services): Promise<TaskService> {
	const taskService = new TaskService(env, models, config, services);

	let tasks: Task[] = [
		{
			id: TaskId.DeleteExpiredTokens,
			description: taskIdToLabel(TaskId.DeleteExpiredTokens),
			schedule: '0 */6 * * *',
			run: (models: Models) => models.token().deleteExpiredTokens(),
		},

		{
			id: TaskId.UpdateTotalSizes,
			description: taskIdToLabel(TaskId.UpdateTotalSizes),
			schedule: '0 * * * *',
			run: (models: Models) => models.item().updateTotalSizes(),
		},

		{
			id: TaskId.CompressOldChanges,
			description: taskIdToLabel(TaskId.CompressOldChanges),
			schedule: '0 0 */2 * *',
			run: (models: Models) => models.change().compressOldChanges(),
		},

		{
			id: TaskId.ProcessUserDeletions,
			description: taskIdToLabel(TaskId.ProcessUserDeletions),
			schedule: '10 * * * *',
			run: (_models: Models, services: Services) => services.userDeletion.runMaintenance(),
		},

		// Need to do it relatively frequently so that if the user fixes
		// whatever was causing the oversized account, they can get it
		// re-enabled quickly. Also it's done on minute 30 because it depends on
		// the UpdateTotalSizes task being run.
		{
			id: TaskId.HandleOversizedAccounts,
			description: taskIdToLabel(TaskId.HandleOversizedAccounts),
			schedule: '30 */2 * * *',
			run: (models: Models) => models.user().handleOversizedAccounts(),
		},

		{
			id: TaskId.DeleteExpiredSessions,
			description: taskIdToLabel(TaskId.DeleteExpiredSessions),
			schedule: '0 */6 * * *',
			run: (models: Models) => models.session().deleteExpiredSessions(),
		},

		{
			id: TaskId.ProcessOrphanedItems,
			description: taskIdToLabel(TaskId.ProcessOrphanedItems),
			schedule: '15 * * * *',
			run: (models: Models) => models.item().processOrphanedItems(),
		},
	];

	if (config.USER_DATA_AUTO_DELETE_ENABLED) {
		tasks.push({
			id: TaskId.AutoAddDisabledAccountsForDeletion,
			description: taskIdToLabel(TaskId.AutoAddDisabledAccountsForDeletion),
			schedule: '0 14 * * *',
			run: (_models: Models, services: Services) => services.userDeletion.autoAddForDeletion(),
		});
	}

	if (config.isJoplinCloud) {
		tasks = tasks.concat([
			{
				id: TaskId.HandleBetaUserEmails,
				description: taskIdToLabel(TaskId.HandleBetaUserEmails),
				schedule: '0 12 * * *',
				run: (models: Models) => models.user().handleBetaUserEmails(),
			},
			{
				id: TaskId.HandleFailedPaymentSubscriptions,
				description: taskIdToLabel(TaskId.HandleFailedPaymentSubscriptions),
				schedule: '0 13 * * *',
				run: (models: Models) => models.user().handleFailedPaymentSubscriptions(),
			},
		]);
	}

	await taskService.registerTasks(tasks);

	return taskService;
}
