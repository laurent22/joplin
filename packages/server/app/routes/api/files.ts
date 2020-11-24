import { ErrorNotFound, ErrorMethodNotAllowed } from '../../utils/errors';
import { File } from '../../db';
import { sessionIdFromHeaders } from '../../utils/requestUtils';
import { SubPath, Route, ApiResponseType, ApiResponse } from '../../utils/routeUtils';
import { AppContext } from '../../utils/types';
import * as fs from 'fs-extra';
const formidable = require('formidable');

interface FormParseResult {
	fields: any;
	files: any;
}

async function formParse(req: any): Promise<FormParseResult> {
	return new Promise((resolve: Function, reject: Function) => {
		const form = formidable({ multiples: true });
		form.parse(req, (error: any, fields: any, files: any) => {
			if (error) {
				reject(error);
				return;
			}

			resolve({ fields, files });
		});
	});
}

const route: Route = {

	exec: async function(path: SubPath, ctx: AppContext) {
		const fileController = ctx.controllers.file();

		console.info(`${ctx.method} ${path.id}${path.link ? `/${path.link}` : ''}`);

		if (!path.link) {
			if (ctx.method === 'GET') {
				return fileController.getFile(sessionIdFromHeaders(ctx.headers), path.id);
			}

			if (ctx.method === 'PATCH') {
				return fileController.patchFile(sessionIdFromHeaders(ctx.headers), path.id, ctx.request.body);
			}

			if (ctx.method === 'DELETE') {
				return fileController.deleteFile(sessionIdFromHeaders(ctx.headers), path.id);
			}

			throw new ErrorMethodNotAllowed();
		}

		if (path.link === 'content') {
			if (ctx.method === 'GET') {
				const koaResponse = ctx.response;
				const file: File = await fileController.getFileContent(sessionIdFromHeaders(ctx.headers), path.id);
				koaResponse.body = file.content;
				koaResponse.set('Content-Type', file.mime_type);
				koaResponse.set('Content-Length', file.size.toString());
				return new ApiResponse(ApiResponseType.KoaResponse, koaResponse);
			}

			if (ctx.method === 'PUT') {
				const result = await formParse(ctx.req);
				const buffer = await fs.readFile(result.files.file.path);
				return fileController.putFileContent(sessionIdFromHeaders(ctx.headers), path.id, buffer);
			}

			throw new ErrorMethodNotAllowed();
		}

		if (path.link === 'children') {
			if (ctx.method === 'GET') {
				return fileController.getChildren(sessionIdFromHeaders(ctx.headers), path.id);
			}

			if (ctx.method === 'POST') {
				return fileController.postChild(sessionIdFromHeaders(ctx.headers), path.id, ctx.request.body);
			}

			throw new ErrorMethodNotAllowed();
		}

		throw new ErrorNotFound(`Invalid link: ${path.link}`);
	},

	needsBodyMiddleware: true,

};

export default route;
