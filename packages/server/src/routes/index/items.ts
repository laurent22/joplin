import { SubPath, redirect, respondWithItemContent } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { AppContext } from '../../utils/types';
import { formParse } from '../../utils/requestUtils';
import { ErrorNotFound } from '../../utils/errors';
import config from '../../config';
import { formatDateTime } from '../../utils/time';
import defaultView from '../../utils/defaultView';
import { View } from '../../services/MustacheService';
import { makeTablePagination, makeTableView, Row, Table, tablePartials } from '../../utils/views/table';
const prettyBytes = require('pretty-bytes');

const router = new Router();

router.get('items', async (_path: SubPath, ctx: AppContext) => {
	const pagination = makeTablePagination(ctx.query);
	const paginatedItems = await ctx.models.item().children(ctx.owner.id, '', pagination, { fields: ['id', 'name', 'updated_time', 'mime_type', 'content_size'] });

	const table: Table = {
		baseUrl: ctx.models.item().itemUrl(),
		requestQuery: ctx.query,
		totalItemCount: await ctx.models.item().childrenCount(ctx.owner.id, ''),
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
			const row: Row = [
				{
					value: item.name,
					stretch: true,
					url: `${config().baseUrl}/items/${item.id}/content`,
				},
				{
					value: prettyBytes(item.content_size),
				},
				{
					value: item.mime_type || 'binary',
				},
				{
					value: formatDateTime(item.updated_time),
				},
			];

			return row;
		}),
	};

	const view: View = defaultView('items');
	view.content.itemTable = makeTableView(table),
	view.content.postUrl = `${config().baseUrl}/items`;
	view.cssFiles = ['index/items'];
	view.partials = view.partials.concat(tablePartials());
	return view;
});

router.get('items/:id/content', async (path: SubPath, ctx: AppContext) => {
	const itemModel = ctx.models.item();
	const item = await itemModel.loadWithContent(path.id);
	if (!item) throw new ErrorNotFound();
	return respondWithItemContent(ctx.response, item, item.content);
});

router.post('items', async (_path: SubPath, ctx: AppContext) => {
	const body = await formParse(ctx.req);
	const fields = body.fields;

	if (fields.delete_all_button) {
		const itemModel = ctx.models.item();
		await itemModel.deleteAll(ctx.owner.id);
	} else {
		throw new Error('Invalid form button');
	}

	return redirect(ctx, await ctx.models.item().itemUrl());
});

export default router;
