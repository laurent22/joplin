import * as Koa from 'koa';
import * as fs from 'fs-extra';
import { ErrorBadRequest } from '../../utils/errors';
import { File } from '../../db';
import FileController from '../../controllers/FileController';
import { sessionIdFromHeaders } from '../../utils/requestUtils';

export default async function(path:string, ctx:Koa.Context) {
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

	const fileController = new FileController();
	return fileController.createFile(sessionIdFromHeaders(ctx.headers), file);
}
