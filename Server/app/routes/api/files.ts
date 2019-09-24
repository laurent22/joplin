import * as Koa from 'koa';
import * as fs from 'fs-extra';
import { ErrorBadRequest, ErrorNotFound } from '../../utils/errors';
import { File } from '../../db';
import FileController from '../../controllers/FileController';
import { sessionIdFromHeaders } from '../../utils/requestUtils';
import { SubPath, Route, ApiResponseType, ApiResponse } from '../../utils/routeUtils';

const route:Route = {

	exec: async function(path:SubPath, ctx:Koa.Context) {
		const fileController = new FileController();

		if (!path.link) {
			if (ctx.method === 'POST') {
				const files = ctx.request.files;
				if (!files || !files.data) throw new ErrorBadRequest('Missing "data" field');
				const data = files.data;
				const props:any = ctx.request.body.props;

				const file:File = {
					name: data.name,
					content: await fs.readFile(data.path),
					mime_type: data.type,
					parent_id: props.parent_id ? props.parent_id : '',
				};

				return fileController.createFile(sessionIdFromHeaders(ctx.headers), file);
			}

			if (ctx.method === 'GET') {
				return fileController.getFile(sessionIdFromHeaders(ctx.headers), path.value);
			}

			if (ctx.method === 'PUT') {
				const body = { ...ctx.request.body };
				body.id = path.value;
				return fileController.updateFile(sessionIdFromHeaders(ctx.headers), body);
			}
		}

		if (path.link === 'content') {
			if (ctx.method === 'GET') {
				const koaResponse = ctx.response;
				const file:File = await fileController.getFileContent(sessionIdFromHeaders(ctx.headers), path.value);
				koaResponse.body = file.content;
				koaResponse.set('Content-Type', file.mime_type);
				koaResponse.set('Content-Length', file.size.toString());
				return new ApiResponse(ApiResponseType.KoaResponse, koaResponse);
			}

			if (ctx.method === 'PUT') {
				const files = ctx.request.files;
				if (!files || !files.data) throw new ErrorBadRequest('Missing "data" field');
				const data = files.data;
				const content = await fs.readFile(data.path);
				return fileController.updateFileContent(sessionIdFromHeaders(ctx.headers), path.value, content);
			}
		}

		throw new ErrorNotFound(`Invalid link: ${path.link}`);
	},

	needsBodyMiddleware: true,

};

export default route;
