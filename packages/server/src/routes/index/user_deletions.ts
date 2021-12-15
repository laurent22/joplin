import { SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import { ErrorForbidden, ErrorMethodNotAllowed } from '../../utils/errors';
import defaultView from '../../utils/defaultView';
import { yesOrNo } from '../../utils/strings';
import { makeTablePagination, makeTableView, Row, Table } from '../../utils/views/table';
import { PaginationOrderDir } from '../../models/utils/pagination';
import { formatDateTime } from '../../utils/time';
import { userDeletionsUrl, userUrl } from '../../utils/urlUtils';

const router: Router = new Router(RouteType.Web);

router.get('user_deletions', async (_path: SubPath, ctx: AppContext) => {
	const user = ctx.joplin.owner;
	if (!user.is_admin) throw new ErrorForbidden();

	if (ctx.method === 'GET') {
		const pagination = makeTablePagination(ctx.query, 'scheduled_time', PaginationOrderDir.ASC);
		const page = await ctx.joplin.models.userDeletion().allPaginated(pagination);
		const users = await ctx.joplin.models.user().loadByIds(page.items.map(d => d.user_id), { fields: ['id', 'email'] });

		console.info(page);

		const table: Table = {
			baseUrl: userDeletionsUrl(),
			requestQuery: ctx.query,
			pageCount: page.page_count,
			pagination,
			headers: [
				{
					name: 'email',
					label: 'Email',
					stretch: true,
				},
				{
					name: 'process_data',
					label: 'Data?',
				},
				{
					name: 'process_account',
					label: 'Account?',
				},
				{
					name: 'scheduled_time',
					label: 'Scheduled',
				},
				{
					name: 'start_time',
					label: 'Start',
				},
				{
					name: 'end_time',
					label: 'End',
				},
				{
					name: 'success',
					label: 'Success?',
				},
				{
					name: 'error',
					label: 'Error',
				},
			],
			rows: page.items.map(d => {
				const isDone = d.end_time && d.success;

				const row: Row = [
					{
						value: isDone ? d.user_id : users.find(u => u.id === d.user_id).email,
						stretch: true,
						url: isDone ? '' : userUrl(d.user_id),
					},
					{
						value: yesOrNo(d.process_data),
					},
					{
						value: yesOrNo(d.process_account),
					},
					{
						value: formatDateTime(d.scheduled_time),
					},
					{
						value: formatDateTime(d.start_time),
					},
					{
						value: formatDateTime(d.end_time),
					},
					{
						value: d.end_time ? yesOrNo(d.success) : '-',
					},
					{
						value: d.error,
					},
				];

				return row;
			}),
		};

		const view = defaultView('user_deletions', 'User deletions');
		view.content = {
			userDeletionTable: makeTableView(table),
		};
		view.cssFiles = ['index/user_deletions'];

		return view;
	}

	throw new ErrorMethodNotAllowed();
});

export default router;
