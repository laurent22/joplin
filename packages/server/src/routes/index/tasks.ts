import { makeUrl, redirect, SubPath, UrlType } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import { bodyFields } from '../../utils/requestUtils';
import { ErrorBadRequest, ErrorForbidden } from '../../utils/errors';
import defaultView from '../../utils/defaultView';
import { makeTableView, Row, Table } from '../../utils/views/table';
import { yesOrNo } from '../../utils/strings';
import { formatDateTime } from '../../utils/time';
import { createCsrfTag } from '../../utils/csrf';
import { RunType } from '../../services/TaskService';
import { NotificationKey } from '../../models/NotificationModel';
import { NotificationLevel } from '../../services/database/types';

const router: Router = new Router(RouteType.Web);

router.post('tasks', async (_path: SubPath, ctx: AppContext) => {
	const user = ctx.joplin.owner;
	if (!user.is_admin) throw new ErrorForbidden();

	const taskService = ctx.joplin.services.tasks;
	const fields: any = await bodyFields(ctx.req);

	if (fields.startTaskButton) {
		const errors: Error[] = [];

		for (const k of Object.keys(fields)) {
			if (k.startsWith('checkbox_')) {
				const taskId = k.substr(9);
				try {
					void taskService.runTask(taskId, RunType.Manual);
				} catch (error) {
					errors.push(error);
				}
			}
		}

		if (errors.length) {
			await ctx.joplin.models.notification().add(
				user.id,
				NotificationKey.Any,
				NotificationLevel.Error,
				`Some tasks could not be started: ${errors.join('. ')}`
			);
		}
	} else {
		throw new ErrorBadRequest('Invalid action');
	}

	return redirect(ctx, makeUrl(UrlType.Tasks));
});

router.get('tasks', async (_path: SubPath, ctx: AppContext) => {
	const user = ctx.joplin.owner;
	if (!user.is_admin) throw new ErrorForbidden();

	const taskService = ctx.joplin.services.tasks;

	const taskRows: Row[] = [];
	for (const [taskId, task] of Object.entries(taskService.tasks)) {
		const state = taskService.taskState(taskId);

		taskRows.push([
			{
				value: `checkbox_${taskId}`,
				checkbox: true,
			},
			{
				value: taskId,
			},
			{
				value: task.description,
			},
			{
				value: task.schedule,
			},
			{
				value: yesOrNo(state.running),
			},
			{
				value: state.lastRunTime ? formatDateTime(state.lastRunTime) : '-',
			},
			{
				value: state.lastCompletionTime ? formatDateTime(state.lastCompletionTime) : '-',
			},
		]);
	}

	const table: Table = {
		headers: [
			{
				name: 'select',
				label: '',
			},
			{
				name: 'id',
				label: 'ID',
			},
			{
				name: 'description',
				label: 'Description',
			},
			{
				name: 'schedule',
				label: 'Schedule',
			},
			{
				name: 'running',
				label: 'Running',
			},
			{
				name: 'lastRunTime',
				label: 'Last Run',
			},
			{
				name: 'lastCompletionTime',
				label: 'Last Completion',
			},
		],
		rows: taskRows,
	};

	return {
		...defaultView('tasks', 'Tasks'),
		content: {
			itemTable: makeTableView(table),
			postUrl: makeUrl(UrlType.Tasks),
			csrfTag: await createCsrfTag(ctx),
		},
		cssFiles: ['index/tasks'],
	};
});

export default router;
