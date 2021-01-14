import { ErrorNotFound, ErrorBadRequest } from '../../utils/errors';
import { File } from '../../db';
import { bodyFields, formParse } from '../../utils/requestUtils';
import { SubPath, respondWithFileContent } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { AppContext } from '../../utils/types';
import * as fs from 'fs-extra';
import { requestChangePagination, requestPagination } from '../../models/utils/pagination';

const router = new Router();

router.get('api/files/:id', async (path: SubPath, ctx: AppContext) => {
	const fileModel = ctx.models.file({ userId: ctx.owner.id });
	const fileId = path.id;
	const file: File = await fileModel.entityFromItemId(fileId);
	const loadedFile = await fileModel.load(file.id);
	if (!loadedFile) throw new ErrorNotFound();
	return fileModel.toApiOutput(loadedFile);
});

router.patch('api/files/:id', async (path: SubPath, ctx: AppContext) => {
	const fileModel = ctx.models.file({ userId: ctx.owner.id });
	const fileId = path.id;
	const inputFile: File = await bodyFields(ctx.req);
	const existingFile: File = await fileModel.entityFromItemId(fileId);
	const newFile = fileModel.fromApiInput(inputFile);
	newFile.id = existingFile.id;
	return fileModel.toApiOutput(await fileModel.save(newFile));
});

router.del('api/files/:id', async (path: SubPath, ctx: AppContext) => {
	const fileModel = ctx.models.file({ userId: ctx.owner.id });
	const fileId = path.id;
	try {
		const file: File = await fileModel.entityFromItemId(fileId, { mustExist: false });
		if (!file.id) return;
		await fileModel.delete(file.id);
	} catch (error) {
		if (error instanceof ErrorNotFound) {
			// That's ok - a no-op
		} else {
			throw error;
		}
	}
});

router.get('api/files/:id/content', async (path: SubPath, ctx: AppContext) => {
	const fileModel = ctx.models.file({ userId: ctx.owner.id });
	const fileId = path.id;
	let file: File = await fileModel.entityFromItemId(fileId);
	file = await fileModel.loadWithContent(file.id);
	if (!file) throw new ErrorNotFound();
	return respondWithFileContent(ctx.response, file);
});

router.put('api/files/:id/content', async (path: SubPath, ctx: AppContext) => {
	const fileModel = ctx.models.file({ userId: ctx.owner.id });
	const fileId = path.id;
	const result = await formParse(ctx.req);
	if (!result?.files?.file) throw new ErrorBadRequest('File data is missing');
	const buffer = await fs.readFile(result.files.file.path);

	const file: File = await fileModel.entityFromItemId(fileId, { mustExist: false });
	file.content = buffer;
	return fileModel.toApiOutput(await fileModel.save(file, { validationRules: { mustBeFile: true } }));
});

router.del('api/files/:id/content', async (path: SubPath, ctx: AppContext) => {
	const fileModel = ctx.models.file({ userId: ctx.owner.id });
	const fileId = path.id;
	const file: File = await fileModel.entityFromItemId(fileId, { mustExist: false });
	if (!file) return;
	file.content = Buffer.alloc(0);
	await fileModel.save(file, { validationRules: { mustBeFile: true } });
});

router.get('api/files/:id/delta', async (path: SubPath, ctx: AppContext) => {
	const fileModel = ctx.models.file({ userId: ctx.owner.id });
	const dir: File = await fileModel.entityFromItemId(path.id, { mustExist: true });
	const changeModel = ctx.models.change({ userId: ctx.owner.id });
	return changeModel.byDirectoryId(dir.id, requestChangePagination(ctx.query));
});

router.get('api/files/:id/children', async (path: SubPath, ctx: AppContext) => {
	const fileModel = ctx.models.file({ userId: ctx.owner.id });
	const parent: File = await fileModel.entityFromItemId(path.id);
	return fileModel.toApiOutput(await fileModel.childrens(parent.id, requestPagination(ctx.query)));
});

router.post('api/files/:id/children', async (path: SubPath, ctx: AppContext) => {
	const fileModel = ctx.models.file({ userId: ctx.owner.id });
	const child: File = fileModel.fromApiInput(await bodyFields(ctx.req));
	const parent: File = await fileModel.entityFromItemId(path.id);
	child.parent_id = parent.id;
	return fileModel.toApiOutput(await fileModel.save(child));
});

export default router;
