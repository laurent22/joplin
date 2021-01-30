import { ErrorNotFound } from '../../utils/errors';
import { File, Uuid } from '../../db';
import { bodyFields, formParse } from '../../utils/requestUtils';
import { SubPath, respondWithFileContent } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { AppContext } from '../../utils/types';
import * as fs from 'fs-extra';
import { requestChangePagination, requestPagination } from '../../models/utils/pagination';

const router = new Router();

router.get('api/files/:id', async (path: SubPath, ctx: AppContext) => {
	const fileModel = ctx.models.file({ userId: ctx.owner.id });
	const file: File = await fileModel.pathToFile(path.id);
	return fileModel.toApiOutput(file);
});

router.patch('api/files/:id', async (path: SubPath, ctx: AppContext) => {
	const fileModel = ctx.models.file({ userId: ctx.owner.id });
	const fileId = path.id;
	const inputFile: File = await bodyFields(ctx.req);
	const existingFileId: Uuid = await fileModel.pathToFileId(fileId);
	const newFile = fileModel.fromApiInput(inputFile);
	newFile.id = existingFileId;
	return fileModel.toApiOutput(await fileModel.save(newFile));
});

router.del('api/files/:id', async (path: SubPath, ctx: AppContext) => {
	const fileModel = ctx.models.file({ userId: ctx.owner.id });
	// const fileId = path.id;
	try {
		const fileId: Uuid = await fileModel.pathToFileId(path.id, { mustExist: false });
		if (!fileId) return;
		await fileModel.delete(fileId);
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
	const fileId: Uuid = await fileModel.pathToFileId(path.id);
	const file = await fileModel.loadWithContent(fileId);
	if (!file) throw new ErrorNotFound();
	return respondWithFileContent(ctx.response, file);
});

router.put('api/files/:id/content', async (path: SubPath, ctx: AppContext) => {
	const fileModel = ctx.models.file({ userId: ctx.owner.id });
	const fileId = path.id;
	const result = await formParse(ctx.req);

	// When an app PUTs an empty file, `result.files` will be an emtpy object
	// (could be the way Formidable parses the data?), but we still need to
	// process the file so we set its content to an empty buffer.
	// https://github.com/laurent22/joplin/issues/4402
	const buffer = result?.files?.file ? await fs.readFile(result.files.file.path) : Buffer.alloc(0);

	const file: File = await fileModel.pathToFile(fileId, { mustExist: false, returnFullEntity: false });
	file.content = buffer;
	return fileModel.toApiOutput(await fileModel.save(file, { validationRules: { mustBeFile: true } }));
});

router.del('api/files/:id/content', async (path: SubPath, ctx: AppContext) => {
	const fileModel = ctx.models.file({ userId: ctx.owner.id });
	const fileId = path.id;
	const file: File = await fileModel.pathToFile(fileId, { mustExist: false, returnFullEntity: false });
	if (!file) return;
	file.content = Buffer.alloc(0);
	await fileModel.save(file, { validationRules: { mustBeFile: true } });
});

router.get('api/files/:id/delta', async (path: SubPath, ctx: AppContext) => {
	const fileModel = ctx.models.file({ userId: ctx.owner.id });
	const dirId: Uuid = await fileModel.pathToFileId(path.id);
	const changeModel = ctx.models.change({ userId: ctx.owner.id });
	return changeModel.byDirectoryId(dirId, requestChangePagination(ctx.query));
});

router.get('api/files/:id/children', async (path: SubPath, ctx: AppContext) => {
	const fileModel = ctx.models.file({ userId: ctx.owner.id });
	const parentId: Uuid = await fileModel.pathToFileId(path.id);
	return fileModel.toApiOutput(await fileModel.childrens(parentId, requestPagination(ctx.query)));
});

router.post('api/files/:id/children', async (path: SubPath, ctx: AppContext) => {
	const fileModel = ctx.models.file({ userId: ctx.owner.id });
	const child: File = fileModel.fromApiInput(await bodyFields(ctx.req));
	const parentId: Uuid = await fileModel.pathToFileId(path.id);
	child.parent_id = parentId;
	return fileModel.toApiOutput(await fileModel.save(child));
});

export default router;
