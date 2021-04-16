import { Item } from '../../db';
import { formParse } from '../../utils/requestUtils';
import { respondWithItemContent, SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { AppContext } from '../../utils/types';
import * as fs from 'fs-extra';
import { ErrorNotFound } from '../../utils/errors';
import ItemModel from '../../models/ItemModel';
import { requestChangePagination, requestPagination } from '../../models/utils/pagination';

const router = new Router();

async function itemFromPath(itemModel: ItemModel, path: SubPath, mustExists: boolean = true): Promise<Item> {
	const name = itemModel.pathToName(path.id);
	const item = await itemModel.loadByName(name);
	if (mustExists && !item) throw new ErrorNotFound(`Not found: ${path.id}`);
	return item;
}

router.get('api/items/:id', async (path: SubPath, ctx: AppContext) => {
	const itemModel = ctx.models.item({ userId: ctx.owner.id });
	const item = await itemFromPath(itemModel, path);
	return itemModel.toApiOutput(item);
});

// router.patch('api/files/:id', async (path: SubPath, ctx: AppContext) => {
// 	const itemModel = ctx.models.item({ userId: ctx.owner.id });
// 	const item = await itemFromPath(itemModel, path);
// 	const inputItem: Item = await bodyFields(ctx.req);
// 	const newItem = itemModel.fromApiInput(inputItem);
// 	newItem.id = item.id;
// 	return itemModel.toApiOutput(await itemModel.save(newItem));
// });

// TODO: add tests
router.del('api/files/:id', async (path: SubPath, ctx: AppContext) => {
	const itemModel = ctx.models.item({ userId: ctx.owner.id });

	try {
		const item = await itemFromPath(itemModel, path);
		await itemModel.delete(item.id);
	} catch (error) {
		if (error instanceof ErrorNotFound) {
			// That's ok - a no-op
		} else {
			throw error;
		}
	}
});

router.get('api/items/:id/content', async (path: SubPath, ctx: AppContext) => {
	const itemModel = ctx.models.item({ userId: ctx.owner.id });
	const item = await itemFromPath(itemModel, path);
	const serializedContent = await itemModel.serializedContent(item.id);
	return respondWithItemContent(ctx.response, item, serializedContent);
});

router.put('api/items/:id/content', async (path: SubPath, ctx: AppContext) => {
	const itemModel = ctx.models.item({ userId: ctx.owner.id });
	const name = itemModel.pathToName(path.id);
	const parsedBody = await formParse(ctx.req);
	const buffer = parsedBody?.files?.file ? await fs.readFile(parsedBody.files.file.path) : Buffer.alloc(0);
	const item = await itemModel.saveFromRawContent(name, buffer);
	return itemModel.toApiOutput(item);
});

// router.del('api/files/:id/content', async (path: SubPath, ctx: AppContext) => {
// 	const fileModel = ctx.models.file({ userId: ctx.owner.id });
// 	const fileId = path.id;
// 	const file: File = await fileModel.pathToFile(fileId, { mustExist: false, returnFullEntity: true });
// 	if (!file) return;

// 	await fileModel.save({
// 		...file,
// 		content: Buffer.alloc(0),
// 	}, { validationRules: { mustBeFile: true } });
// });

router.get('api/items/:id/delta', async (_path: SubPath, ctx: AppContext) => {
	const changeModel = ctx.models.change({ userId: ctx.owner.id });
	return changeModel.allForUser(requestChangePagination(ctx.query));
});

router.get('api/items/:id/children', async (path: SubPath, ctx: AppContext) => {
	const itemModel = ctx.models.item({ userId: ctx.owner.id });
	const parentName = itemModel.pathToName(path.id);
	const result = await itemModel.children(parentName, requestPagination(ctx.query));
	return result;
});

// router.get('api/files/:id/children', async (path: SubPath, ctx: AppContext) => {
// 	const fileModel = ctx.models.file({ userId: ctx.owner.id });
// 	const parentId: Uuid = await fileModel.pathToFileId(path.id);
// 	return fileModel.toApiOutput(await fileModel.childrens(parentId, requestPagination(ctx.query)));
// });

// router.post('api/files/:id/children', async (path: SubPath, ctx: AppContext) => {
// 	const fileModel = ctx.models.file({ userId: ctx.owner.id });
// 	const child: File = fileModel.fromApiInput(await bodyFields(ctx.req));
// 	const parentId: Uuid = await fileModel.pathToFileId(path.id);
// 	child.parent_id = parentId;
// 	return fileModel.toApiOutput(await fileModel.save(child));
// });

export default router;
