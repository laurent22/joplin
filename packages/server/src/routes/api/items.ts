import { Item, Uuid } from '../../services/database/types';
import { formParse } from '../../utils/requestUtils';
import { respondWithItemContent, SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import * as fs from 'fs-extra';
import { ErrorBadRequest, ErrorForbidden, ErrorMethodNotAllowed, ErrorNotFound, ErrorPayloadTooLarge, errorToPlainObject } from '../../utils/errors';
import ItemModel, { ItemSaveOption, PaginatedItems, SaveFromRawContentItem } from '../../models/ItemModel';
import { requestDeltaPagination, requestPagination } from '../../models/utils/pagination';
import { AclAction } from '../../models/BaseModel';
import { safeRemove } from '../../utils/fileUtils';
import { formatBytes, MB } from '../../utils/bytes';
import { Value } from '../../models/KeyValueModel';

const router = new Router(RouteType.Api);

const batchMaxSize = 1 * MB;

interface LockHandlerResult {
	handled: boolean;
	response: any;
}

const lockHandler = async (path: SubPath, ctx: AppContext, requestBody: Buffer = null): Promise<LockHandlerResult | null> => {
	// return { handled: false, response: null };
	if (!path.id || !path.id.startsWith('root:/locks/')) return { handled: false, response: null };

	const ownerId = ctx.joplin.owner.id;
	const models = ctx.joplin.models;

	const userKey = `locks::${ownerId}`;

	// PUT /api/items/root:/locks/exclusive_cli_12cb74fa9de644958b2ccbc772cb4e29.json:/content

	if (ctx.method === 'PUT') {
		const itemName = models.item().pathToName(path.id);
		const now = Date.now();

		await models.keyValue().readThenWrite(userKey, async (value: Value) => {
			const output = value ? JSON.parse(value as string) : {};
			output[itemName] = {
				name: itemName,
				updated_time: now,
				jop_updated_time: now,
				content: requestBody.toString(),
			};
			return JSON.stringify(output);
		});

		// {
		// 	'locks/exclusive_cli_cc75ed109c0c40d5ac8707d222fe33bc.json': {
		// 	  item: {
		// 		name: 'locks/exclusive_cli_cc75ed109c0c40d5ac8707d222fe33bc.json',
		// 		updated_time: 1635709007725,
		// 		id: 'v9Yv5WSxAKF75ZW0dnv8nOQ8hzg5rUz1'
		// 	  },
		// 	  error: null
		// 	}
		//   }

		return {
			handled: true,
			response: {
				[itemName]: {
					item: {
						name: itemName,
						updated_time: now,
						id: null,
					},
					error: null,
				},
			},
		};
	}

	// DELETE /api/items/root:/locks/exclusive_cli_12cb74fa9de644958b2ccbc772cb4e29.json:

	if (ctx.method === 'DELETE') {
		const itemName = models.item().pathToName(path.id);

		await models.keyValue().readThenWrite(userKey, async (value: Value) => {
			const output = value ? JSON.parse(value as string) : {};
			delete output[itemName];
			return JSON.stringify(output);
		});

		return {
			handled: true,
			response: null,
		};
	}

	// GET /api/items/root:/locks/*:/children

	if (ctx.method === 'GET' && path.id === 'root:/locks/*:') {
		const result = await models.keyValue().value<string>(userKey);
		const obj: Record<string, Item> = result ? JSON.parse(result) : {};

		const items: Item[] = [];
		for (const name of Object.keys(obj)) {
			items.push(obj[name]);
		}

		const page: PaginatedItems = {
			has_more: false,
			items,
		};

		return {
			handled: true,
			response: page,
		};
	}

	throw new ErrorBadRequest(`Unhandled lock path: ${path.id}`);
};

export async function putItemContents(path: SubPath, ctx: AppContext, isBatch: boolean) {
	if (!ctx.joplin.owner.can_upload) throw new ErrorForbidden('Uploading content is disabled');

	const parsedBody = await formParse(ctx.req);
	const bodyFields = parsedBody.fields;
	const saveOptions: ItemSaveOption = {};

	let items: SaveFromRawContentItem[] = [];

	if (isBatch) {
		let totalSize = 0;
		items = bodyFields.items.map((item: any) => {
			totalSize += item.name.length + (item.body ? item.body.length : 0);
			return {
				name: item.name,
				body: item.body ? Buffer.from(item.body, 'utf8') : Buffer.alloc(0),
			};
		});

		if (totalSize > batchMaxSize) throw new ErrorPayloadTooLarge(`Size of items (${formatBytes(totalSize)}) is over the limit (${formatBytes(batchMaxSize)})`);
	} else {
		const filePath = parsedBody?.files?.file ? parsedBody.files.file.path : null;

		try {
			const buffer = filePath ? await fs.readFile(filePath) : Buffer.alloc(0);

			const lockResult = await lockHandler(path, ctx, buffer);
			if (lockResult.handled) return lockResult.response;

			// This end point can optionally set the associated jop_share_id field. It
			// is only useful when uploading resource blob (under .resource folder)
			// since they can't have metadata. Note, Folder and Resource items all
			// include the "share_id" field property so it doesn't need to be set via
			// query parameter.
			if (ctx.query['share_id']) {
				saveOptions.shareId = ctx.query['share_id'];
				await ctx.joplin.models.item().checkIfAllowed(ctx.joplin.owner, AclAction.Create, { jop_share_id: saveOptions.shareId });
			}

			items = [
				{
					name: ctx.joplin.models.item().pathToName(path.id),
					body: buffer,
				},
			];
		} finally {
			if (filePath) await safeRemove(filePath);
		}
	}

	const output = await ctx.joplin.models.item().saveFromRawContent(ctx.joplin.owner, items, saveOptions);
	for (const [name] of Object.entries(output)) {
		if (output[name].item) output[name].item = ctx.joplin.models.item().toApiOutput(output[name].item) as Item;
		if (output[name].error) output[name].error = errorToPlainObject(output[name].error);
	}

	return output;
}

// Note about access control:
//
// - All these calls are scoped to a user, which is derived from the session
// - All items are accessed by userId/itemName
// - In other words, it is not possible for a user to access another user's
//   items, thus the lack of checkIfAllowed() calls as that would not be
//   necessary, and would be slower.
// - For now, users who are shared a folder with have full access to all items
//   within that folder. Except that they cannot delete the root folder if they
//   are not the owner, so there's a check in this case.

async function itemFromPath(userId: Uuid, itemModel: ItemModel, path: SubPath, mustExists: boolean = true): Promise<Item> {
	const name = itemModel.pathToName(path.id);
	const item = await itemModel.loadByName(userId, name);
	if (mustExists && !item) throw new ErrorNotFound(`Not found: ${path.id}`);
	return item;
}

router.get('api/items/:id', async (path: SubPath, ctx: AppContext) => {
	const itemModel = ctx.joplin.models.item();
	const item = await itemFromPath(ctx.joplin.owner.id, itemModel, path);
	return itemModel.toApiOutput(item);
});

router.del('api/items/:id', async (path: SubPath, ctx: AppContext) => {
	try {
		if (path.id === 'root' || path.id === 'root:/:') {
			// We use this for testing only and for safety reasons it's probably
			// best to disable it on production.
			if (ctx.joplin.env !== 'dev') throw new ErrorMethodNotAllowed('Deleting the root is not allowed');
			await ctx.joplin.models.item().deleteAll(ctx.joplin.owner.id);
		} else {
			// const item = await itemFromPath(ctx.joplin.owner.id, ctx.joplin.models.item(), path);
			// await ctx.joplin.models.item().checkIfAllowed(ctx.joplin.owner, AclAction.Delete, item);

			const lockResult = await lockHandler(path, ctx);
			if (lockResult.handled) return lockResult.response;

			const item = await itemFromPath(ctx.joplin.owner.id, ctx.joplin.models.item(), path);
			await ctx.joplin.models.item().deleteForUser(ctx.joplin.owner.id, item);
		}
	} catch (error) {
		if (error instanceof ErrorNotFound) {
			// That's ok - a no-op
		} else {
			throw error;
		}
	}
});

router.get('api/items/:id/content', async (path: SubPath, ctx: AppContext) => {
	const itemModel = ctx.joplin.models.item();
	const item = await itemFromPath(ctx.joplin.owner.id, itemModel, path);
	const serializedContent = await itemModel.serializedContent(item.id);
	return respondWithItemContent(ctx.response, item, serializedContent);
});

router.put('api/items/:id/content', async (path: SubPath, ctx: AppContext) => {
	const results = await putItemContents(path, ctx, false);
	const result = results[Object.keys(results)[0]];
	if (result.error) throw result.error;
	return result.item;
});

router.get('api/items/:id/delta', async (_path: SubPath, ctx: AppContext) => {
	const changeModel = ctx.joplin.models.change();
	return changeModel.delta(ctx.joplin.owner.id, requestDeltaPagination(ctx.query));
});

router.get('api/items/:id/children', async (path: SubPath, ctx: AppContext) => {
	const lockResult = await lockHandler(path, ctx);
	if (lockResult.handled) return lockResult.response;

	const itemModel = ctx.joplin.models.item();
	const parentName = itemModel.pathToName(path.id);
	const result = await itemModel.children(ctx.joplin.owner.id, parentName, requestPagination(ctx.query));
	return result;
});

export default router;
