import { SubPath, respondWithItemContent } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import { ErrorForbidden, ErrorNotFound } from '../../utils/errors';
import config, { showItemUrls } from '../../config';
import { formatDateTime } from '../../utils/time';
import defaultView from '../../utils/defaultView';
import { View } from '../../services/MustacheService';
import { makeTablePagination, makeTableView, Row, Table } from '../../utils/views/table';
import { PaginationOrderDir } from '../../models/utils/pagination';
import { formatBytes } from '../../utils/bytes';

const router = new Router(RouteType.Web);

router.get('items', async (_path: SubPath, ctx: AppContext) => {
	if (!ctx.joplin.owner.is_admin) throw new ErrorForbidden();

	const pagination = makeTablePagination(ctx.query, 'name', PaginationOrderDir.ASC);
	const paginatedItems = await ctx.joplin.models.item().children(ctx.joplin.owner.id, '', pagination, { fields: ['id', 'name', 'updated_time', 'mime_type', 'content_size'] });

	const table: Table = {
		baseUrl: ctx.joplin.models.item().itemUrl(),
		requestQuery: ctx.query,
		pageCount: Math.ceil((await ctx.joplin.models.item().childrenCount(ctx.joplin.owner.id, '')) / pagination.limit),
		pagination,
		headers: [
			{
				name: 'name',
				label: 'Name',
				stretch: true,
			},
			{
				name: 'content_size',
				label: 'Size',
			},
			{
				name: 'mime_type',
				label: 'Mime',
			},
			{
				name: 'updated_time',
				label: 'Timestamp',
			},
		],
		rows: paginatedItems.items.map(item => {
			const row: Row = {
				items: [
					{
						value: item.name,
						stretch: true,
						url: showItemUrls(config()) ? `${config().userContentBaseUrl}/items/${item.id}/content` : null,
					},
					{
						value: formatBytes(item.content_size),
					},
					{
						value: item.mime_type || 'binary',
					},
					{
						value: formatDateTime(item.updated_time),
					},
				],
			};

			return row;
		}),
	};

	const view: View = defaultView('items', 'Items');
	view.content.itemTable = makeTableView(table),
	view.content.postUrl = `${config().baseUrl}/items`;
	view.cssFiles = ['index/items'];
	return view;
});

router.get('items/:id/content', async (path: SubPath, ctx: AppContext) => {
	const itemModel = ctx.joplin.models.item();
	const item = await itemModel.loadWithContent(path.id);
	if (!item) throw new ErrorNotFound();
	return respondWithItemContent(ctx.response, item, item.content);
}, RouteType.UserContent);

export default router;
