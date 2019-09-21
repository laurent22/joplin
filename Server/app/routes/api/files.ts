import * as Koa from 'koa';
import * as fs from 'fs-extra';
import { ErrorBadRequest } from '../../utils/errors';
import { File } from '../../db';
import FileController from '../../controllers/FileController';
import { sessionIdFromHeaders } from '../../utils/requestUtils';
import { SubPath, Route } from '../../utils/routeUtils';

const route:Route = {

	exec: async function(path:SubPath, ctx:Koa.Context) {
		const fileController = new FileController();

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
			return fileController.getFile(sessionIdFromHeaders(ctx.headers), path.id);
		}

		if (ctx.method === 'PUT') {
			const body = ctx.request.body;
			return fileController.updateFile(sessionIdFromHeaders(ctx.headers), path.id, body);
		}

	},

	needsBodyMiddleware: true,

};

export default route;
