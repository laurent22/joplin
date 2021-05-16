import { SubPath, redirect, respondWithItemContent } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { AppContext } from '../../utils/types';
import { formParse } from '../../utils/requestUtils';
import { ErrorNotFound } from '../../utils/errors';
import { Item } from '../../db';
import { createPaginationLinks, filterPaginationQueryParams, pageMaxSize, Pagination, PaginationOrder, PaginationOrderDir, requestPaginationOrder, validatePagination } from '../../models/utils/pagination';
import { setQueryParameters } from '../../utils/urlUtils';
import config from '../../config';
import { formatDateTime } from '../../utils/time';
import defaultView from '../../utils/defaultView';
import { View } from '../../services/MustacheService';

function makeFilePagination(query: any): Pagination {
	const limit = Number(query.limit) || pageMaxSize;
	const order: PaginationOrder[] = requestPaginationOrder(query, 'name', PaginationOrderDir.ASC);
	const page: number = 'page' in query ? Number(query.page) : 1;

	const output: Pagination = { limit, order, page };
	validatePagination(output);
	return output;
}

const router = new Router();

router.get('items', async (_path: SubPath, ctx: AppContext) => {
	// Query parameters that should be appended to pagination-related URLs
	const baseUrlQuery = filterPaginationQueryParams(ctx.query);

	const pagination = makeFilePagination(ctx.query);
	const owner = ctx.owner;
	const itemModel = ctx.models.item();
	const paginatedItems = await itemModel.children(owner.id, '', pagination, { fields: ['id', 'name', 'updated_time', 'mime_type'] });
	const pageCount = Math.ceil((await itemModel.childrenCount(owner.id, '')) / pagination.limit);
	const parentBaseUrl = itemModel.itemUrl();
	const paginationLinks = createPaginationLinks(pagination.page, pageCount, setQueryParameters(parentBaseUrl, { ...baseUrlQuery, 'page': 'PAGE_NUMBER' }));

	async function itemToViewItem(item: Item): Promise<any> {
		return {
			name: item.name,
			url: `${config().baseUrl}/items/${item.id}/content`,
			type: 'file',
			icon: 'far fa-file',
			timestamp: formatDateTime(item.updated_time),
			mime: item.mime_type || 'binary',
		};
	}

	const items: any[] = [];

	for (const item of paginatedItems.items) {
		items.push(await itemToViewItem(item));
	}

	const view: View = defaultView('items');
	view.content.paginatedFiles = { ...paginatedItems, items: items };
	view.content.paginationLinks = paginationLinks;
	view.content.postUrl = `${config().baseUrl}/items`;
	view.cssFiles = ['index/items'];
	view.partials.push('pagination');
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
