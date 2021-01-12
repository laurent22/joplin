import { ErrorNotFound, ErrorMethodNotAllowed, ErrorBadRequest } from '../../utils/errors';
import { File } from '../../db';
import { bodyFields, formParse, headerSessionId } from '../../utils/requestUtils';
import { SubPath, Route, respondWithFileContent } from '../../utils/routeUtils';
import { AppContext } from '../../utils/types';
import * as fs from 'fs-extra';
import { requestChangePagination, requestPagination } from '../../models/utils/pagination';

const route: Route = {

	exec: async function(path: SubPath, ctx: AppContext) {
		const fileController = ctx.controllers.apiFile();

		// console.info(`${ctx.method} ${path.id}${path.link ? `/${path.link}` : ''}`);

		if (!path.link) {
			if (ctx.method === 'GET') {
				return fileController.getFile(headerSessionId(ctx.headers), path.id);
			}

			if (ctx.method === 'PATCH') {
				return fileController.patchFile(headerSessionId(ctx.headers), path.id, await bodyFields(ctx.req));
			}

			if (ctx.method === 'DELETE') {
				return fileController.deleteFile(headerSessionId(ctx.headers), path.id);
			}

			throw new ErrorMethodNotAllowed();
		}

		if (path.link === 'content') {
			if (ctx.method === 'GET') {
				const file: File = await fileController.getFileContent(headerSessionId(ctx.headers), path.id);
				return respondWithFileContent(ctx.response, file);
			}

			if (ctx.method === 'PUT') {
				const result = await formParse(ctx.req);
				if (!result?.files?.file) throw new ErrorBadRequest('File data is missing');
				const buffer = await fs.readFile(result.files.file.path);
				return fileController.putFileContent(headerSessionId(ctx.headers), path.id, buffer);
			}

			if (ctx.method === 'DELETE') {
				return fileController.deleteFileContent(headerSessionId(ctx.headers), path.id);
			}

			throw new ErrorMethodNotAllowed();
		}

		if (path.link === 'delta') {
			if (ctx.method === 'GET') {
				return fileController.getDelta(
					headerSessionId(ctx.headers),
					path.id,
					requestChangePagination(ctx.query)
				);
			}

			throw new ErrorMethodNotAllowed();
		}

		if (path.link === 'children') {
			if (ctx.method === 'GET') {
				return fileController.getChildren(headerSessionId(ctx.headers), path.id, requestPagination(ctx.query));
			}

			if (ctx.method === 'POST') {
				return fileController.postChild(headerSessionId(ctx.headers), path.id, await bodyFields(ctx.req));
			}

			throw new ErrorMethodNotAllowed();
		}

		throw new ErrorNotFound(`Invalid link: ${path.link}`);
	},

};

export default route;
