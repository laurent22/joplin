import { ErrorNotFound, ErrorMethodNotAllowed, ErrorBadRequest } from '../../utils/errors';
import { File } from '../../db';
import { bodyFields, formParse } from '../../utils/requestUtils';
import { SubPath, Route, respondWithFileContent } from '../../utils/routeUtils';
import { AppContext } from '../../utils/types';
import * as fs from 'fs-extra';
import { requestChangePagination, requestPagination } from '../../models/utils/pagination';

const route: Route = {

	exec: async function(path: SubPath, ctx: AppContext) {
		// console.info(`${ctx.method} ${path.id}${path.link ? `/${path.link}` : ''}`);

		// -------------------------------------------
		// ROUTE api/files/:id
		// -------------------------------------------

		if (!path.link) {
			const fileModel = ctx.models.file({ userId: ctx.owner.id });
			const fileId = path.id;

			if (ctx.method === 'GET') {
				const file: File = await fileModel.entityFromItemId(fileId);
				const loadedFile = await fileModel.load(file.id);
				if (!loadedFile) throw new ErrorNotFound();
				return fileModel.toApiOutput(loadedFile);
			}

			if (ctx.method === 'PATCH') {
				const inputFile: File = await bodyFields(ctx.req);
				const existingFile: File = await fileModel.entityFromItemId(fileId);
				const newFile = fileModel.fromApiInput(inputFile);
				newFile.id = existingFile.id;
				return fileModel.toApiOutput(await fileModel.save(newFile));
			}

			if (ctx.method === 'DELETE') {
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
				return;
			}

			throw new ErrorMethodNotAllowed();
		}

		// -------------------------------------------
		// ROUTE api/files/:id/content
		// -------------------------------------------

		if (path.link === 'content') {
			const fileModel = ctx.models.file({ userId: ctx.owner.id });
			const fileId = path.id;

			if (ctx.method === 'GET') {
				let file: File = await fileModel.entityFromItemId(fileId);
				file = await fileModel.loadWithContent(file.id);
				if (!file) throw new ErrorNotFound();
				return respondWithFileContent(ctx.response, file);
			}

			if (ctx.method === 'PUT') {
				const result = await formParse(ctx.req);
				if (!result?.files?.file) throw new ErrorBadRequest('File data is missing');
				const buffer = await fs.readFile(result.files.file.path);

				const file: File = await fileModel.entityFromItemId(fileId, { mustExist: false });
				file.content = buffer;
				return fileModel.toApiOutput(await fileModel.save(file, { validationRules: { mustBeFile: true } }));
			}

			if (ctx.method === 'DELETE') {
				const file: File = await fileModel.entityFromItemId(fileId, { mustExist: false });
				if (!file) return;
				file.content = Buffer.alloc(0);
				await fileModel.save(file, { validationRules: { mustBeFile: true } });
				return;
			}

			throw new ErrorMethodNotAllowed();
		}

		// -------------------------------------------
		// ROUTE api/files/:id/delta
		// -------------------------------------------

		if (path.link === 'delta') {
			if (ctx.method === 'GET') {
				const fileModel = ctx.models.file({ userId: ctx.owner.id });
				const dir: File = await fileModel.entityFromItemId(path.id, { mustExist: true });
				const changeModel = ctx.models.change({ userId: ctx.owner.id });
				return changeModel.byDirectoryId(dir.id, requestChangePagination(ctx.query));
			}

			throw new ErrorMethodNotAllowed();
		}

		// -------------------------------------------
		// ROUTE api/files/:id/children
		// -------------------------------------------

		if (path.link === 'children') {
			const fileModel = ctx.models.file({ userId: ctx.owner.id });

			if (ctx.method === 'GET') {
				const parent: File = await fileModel.entityFromItemId(path.id);
				return fileModel.toApiOutput(await fileModel.childrens(parent.id, requestPagination(ctx.query)));
			}

			if (ctx.method === 'POST') {
				const child: File = fileModel.fromApiInput(await bodyFields(ctx.req));
				const parent: File = await fileModel.entityFromItemId(path.id);
				child.parent_id = parent.id;
				return fileModel.toApiOutput(await fileModel.save(child));
			}

			throw new ErrorMethodNotAllowed();
		}

		throw new ErrorNotFound(`Invalid link: ${path.link}`);
	},

};

export default route;
