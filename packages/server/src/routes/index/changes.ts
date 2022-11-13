import { SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import { changeTypeToString } from '../../services/database/types';
import { PaginationOrderDir } from '../../models/utils/pagination';
import { formatDateTime } from '../../utils/time';
import defaultView from '../../utils/defaultView';
import { View } from '../../services/MustacheService';
import { makeTablePagination, Table, Row, makeTableView } from '../../utils/views/table';
import config, { showItemUrls } from '../../config';
import { ErrorForbidden } from '../../utils/errors';

const router = new Router(RouteType.Web);

router.get('changes', async (_path: SubPath, ctx: AppContext) => {
	if (!ctx.joplin.owner.is_admin) throw new ErrorForbidden();

	const pagination = makeTablePagination(ctx.query, 'updated_time', PaginationOrderDir.DESC);
	const paginatedChanges = await ctx.joplin.models.change().allByUser(ctx.joplin.owner.id, pagination);
	const items = await ctx.joplin.models.item().loadByIds(paginatedChanges.items.map(i => i.item_id), { fields: ['id'] });

	const table: Table = {
		baseUrl: ctx.joplin.models.change().changeUrl(),
		requestQuery: ctx.query,
		pageCount: paginatedChanges.page_count,
		pagination,
		headers: [
			{
				name: 'item_name',
				label: 'Name',
				stretch: true,
			},
			{
				name: 'type',
				label: 'Type',
			},
			{
				name: 'updated_time',
				label: 'Timestamp',
			},
		],
		rows: paginatedChanges.items.map(change => {
			const row: Row = {
				items: [
					{
						value: change.item_name,
						stretch: true,
						url: showItemUrls(config()) ? (items.find(i => i.id === change.item_id) ? ctx.joplin.models.item().itemContentUrl(change.item_id) : '') : null,
					},
					{
						value: changeTypeToString(change.type),
					},
					{
						value: formatDateTime(change.updated_time),
					},
				],
			};

			return row;
		}),
	};

	const view: View = defaultView('changes', 'Log');
	view.content.changeTable = makeTableView(table),
	view.cssFiles = ['index/changes'];
	return view;
});

export default router;
