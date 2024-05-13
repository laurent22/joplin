import { SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import defaultView from '../../utils/defaultView';
import { makeTableView, Row, Table } from '../../utils/views/table';
import userActivity from '../../services/reports/userActivity';
import { adminUserUrl, adminReportUrl } from '../../utils/urlUtils';
import { Hour } from '../../utils/time';
import { ErrorNotFound } from '../../utils/errors';
import { ReportType } from '../../services/reports/types';
import { formatBytes } from '../../utils/bytes';

const router: Router = new Router(RouteType.Web);

interface Query {
	intervalHours: number;
}

const parseQuery = (query: Record<string, string>) => {
	const output: Query = {
		intervalHours: 1,
	};

	if (query.intervalHours) output.intervalHours = Number(query.intervalHours);

	return output;
};

router.get('admin/reports/:id', async (path: SubPath, ctx: AppContext) => {
	const reportType = path.id;

	if (reportType === ReportType.UserActivity) {
		const query = parseQuery(ctx.query as Record<string, string>);

		const changes = await userActivity(ctx.joplin.dbSlave, { interval: query.intervalHours * Hour });

		const models = ctx.joplin.models;
		const users = await models.user().loadByIds(changes.map(c => c.user_id), { fields: ['id', 'email'] });

		const changeRows: Row[] = [];
		for (const change of changes) {
			const user = users.find(u => u.id === change.user_id);

			changeRows.push({
				items: [
					{
						value: user ? user.email : change.user_id,
						url: adminUserUrl(change.user_id),
					},
					{
						value: change.total_count.toString(),
					},
					{
						value: change.create_count.toString(),
					},
					{
						value: change.update_count.toString(),
					},
					{
						value: change.delete_count.toString(),
					},
					{
						value: formatBytes(change.uploaded_size),
					},
				],
			});
		}

		const table: Table = {
			headers: [
				{
					name: 'user_id',
					label: 'User',
				},
				{
					name: 'total_count',
					label: 'Total',
				},
				{
					name: 'created_count',
					label: 'Created',
				},
				{
					name: 'updated_count',
					label: 'Updated',
				},
				{
					name: 'deleted_count',
					label: 'Deleted',
				},
				{
					name: 'uploaded_size',
					label: 'Uploaded',
				},
			],
			rows: changeRows,
		};

		return {
			...defaultView(`admin/reports/${reportType}`, 'Report'),
			content: {
				itemTable: makeTableView(table),
				getUrl: adminReportUrl(reportType),
				intervalHours: query.intervalHours,
			},
		};
	}

	throw new ErrorNotFound(`No such report: ${path.id}`);
});

export default router;
