import { SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { AppContext } from '../../utils/types';
import { changeTypeToString } from '../../db';
import { createPaginationLinks, filterPaginationQueryParams, queryParamsToPagination } from '../../models/utils/pagination';
import { setQueryParameters } from '../../utils/urlUtils';
import { formatDateTime } from '../../utils/time';
import defaultView from '../../utils/defaultView';
import { View } from '../../services/MustacheService';

interface ItemToDisplay {
	name: string;
	changeType: string;
	timestamp: string;
	url: string;
}

const router = new Router();

router.get('changes', async (_path: SubPath, ctx: AppContext) => {
	const changeModel = ctx.models.change();
	const itemModel = ctx.models.item();

	const pagination = queryParamsToPagination(ctx.query);

	// {
	// 	"items": [
	// 		{
	// 			"type": 3,
	// 			"item": {
	// 				"id": "QZbQVWTCtr9qpxtEsuWMoQbax8wR1Q75",
	// 				"name": "sync_desktop_bbecbb2d6bf44a16aa14c14f6c51719d.json"
	// 			}
	// 		},
	// 		{
	// 			"type": 1,
	// 			"item": {
	// 				"id": "8ogKqMu58u1FcZ9gaBO1yqPHKzniZSfx",
	// 				"owner_id": "Pg8NSIS3fo7sotSktqb2Rza7EJFcpj3M",
	// 				"name": "ab9e895491844213a43338608deaf573.md",
	// 				"mime_type": "text/markdown",
	// 				"size": 908,
	// 				"is_directory": 0,
	// 				"is_root": 0,
	// 				"parent_id": "5IhOFX314EZOL21p9UUVKZElgjhuUerV",
	// 				"updated_time": 1616235197809,
	// 				"created_time": 1616235197809
	// 			}
	// 		}
	// 	]
	// }

	const paginatedChanges = await changeModel.allForUser(ctx.owner.id, pagination, { compressChanges: false });
	const itemsToDisplay: ItemToDisplay[] = [];
	const items = await ctx.models.item().loadByIds(paginatedChanges.items.map(i => i.item_id), { fields: ['id'] });

	for (const item of paginatedChanges.items) {
		itemsToDisplay.push({
			name: item.item_name,
			changeType: changeTypeToString(item.type),
			timestamp: formatDateTime(item.updated_time),

			// The item associated with the change may have been deleted, and we
			// only display a link for existing items.
			url: items.find(i => i.id === item.item_id) ? await itemModel.itemContentUrl(item.item_id) : '',
		});
	}

	const paginationLinks = createPaginationLinks(
		pagination.page,
		paginatedChanges.page_count,
		setQueryParameters(
			changeModel.changeUrl(), {
				...filterPaginationQueryParams(ctx.query),
				'page': 'PAGE_NUMBER',
			}
		)
	);

	const view: View = defaultView('changes');
	view.content.paginatedChanges = { ...paginatedChanges, items: itemsToDisplay };
	view.content.paginationLinks = paginationLinks;
	view.cssFiles = ['index/changes'];
	view.partials.push('pagination');
	return view;
});

export default router;
