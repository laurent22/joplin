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
import { NotificationLevel, TaskId } from '../../services/database/types';
const prettyCron = require('prettycron');

const router: Router = new Router(RouteType.Web);

router.post('admin/tasks', async (_path: SubPath, ctx: AppContext) => {
	interface FormFields {
		startTaskButton: string;
		enableTaskButton: string;
		disableTaskButton: string;
	}

	const user = ctx.joplin.owner;
	if (!user.is_admin) throw new ErrorForbidden();

	const taskService = ctx.joplin.services.tasks;
	const fields = await bodyFields<FormFields>(ctx.req);

	const taskIds: TaskId[] = [];

	for (const k of Object.keys(fields)) {
		if (k.startsWith('checkbox_')) {
			taskIds.push(Number(k.substr(9)));
		}
	}

	const errors: Error[] = [];

	if (fields.startTaskButton) {
		for (const taskId of taskIds) {
			try {
				void taskService.runTask(taskId, RunType.Manual);
			} catch (error) {
				errors.push(error);
			}
		}
	} else if (fields.enableTaskButton || fields.disableTaskButton) {
		for (const taskId of taskIds) {
			try {
				await taskService.enableTask(taskId, !!fields.enableTaskButton);
			} catch (error) {
				errors.push(error);
			}
		}
	} else {
		throw new ErrorBadRequest('Invalid action');
	}

	if (errors.length) {
		await ctx.joplin.models.notification().add(
			user.id,
			NotificationKey.Any,
			NotificationLevel.Error,
			`Some operations could not be performed: ${errors.join('. ')}`
		);
	}

	return redirect(ctx, makeUrl(UrlType.Tasks));
});

router.get('admin/tasks', async (_path: SubPath, ctx: AppContext) => {
	const user = ctx.joplin.owner;
	if (!user.is_admin) throw new ErrorForbidden();

	const taskService = ctx.joplin.services.tasks;
	const states = await ctx.joplin.models.taskState().loadByTaskIds(taskService.taskIds);

	const taskRows: Row[] = [];
	for (const [taskIdString, task] of Object.entries(taskService.tasks)) {
		const taskId = Number(taskIdString);
		const state = states.find(s => s.task_id === taskId);
		const events = await taskService.taskLastEvents(taskId);

		taskRows.push({
			items: [
				{
					value: `checkbox_${taskId}`,
					checkbox: true,
				},
				{
					value: taskId.toString(),
				},
				{
					value: task.description,
				},
				{
					value: task.schedule,
					hint: prettyCron.toString(task.schedule),
				},
				{
					value: yesOrNo(state.enabled),
				},
				{
					value: yesOrNo(state.running),
				},
				{
					value: events.taskStarted ? formatDateTime(events.taskStarted.created_time) : '-',
				},
				{
					value: events.taskCompleted ? formatDateTime(events.taskCompleted.created_time) : '-',
				},
			],
		});
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
				name: 'enabled',
				label: 'Enabled',
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
		...defaultView('admin/tasks', 'Tasks'),
		content: {
			itemTable: makeTableView(table),
			postUrl: makeUrl(UrlType.Tasks),
			csrfTag: await createCsrfTag(ctx),
		},
	};
});

export default router;
