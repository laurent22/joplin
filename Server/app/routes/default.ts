import * as Koa from 'koa';
import { SubPath, Route, ApiResponse, ApiResponseType } from '../utils/routeUtils';
import { ErrorMethodNotAllowed, ErrorNotFound, ErrorForbidden } from '../utils/errors';
import { dirname, normalize } from 'path';
import { pathExists } from 'fs-extra';
import * as fs from 'fs-extra';
const { mime } = require('lib/mime-utils.js');

const publicDir = `${dirname(dirname(__dirname))}/public`;

async function findLocalFile(path:string):Promise<string> {
	let localPath = normalize(path);
	if (localPath.indexOf('..') >= 0) throw new ErrorNotFound(`Cannot resolve path: ${path}`);
	localPath = `${publicDir}/${localPath}`;
	if (!(await pathExists(localPath))) throw new ErrorNotFound(`Path not found: ${path}`);

	const stat = await fs.stat(localPath);
	if (stat.isDirectory()) throw new ErrorForbidden(`Directory listing not allowed: ${path}`);

	return localPath;
}

const route:Route = {

	exec: async function(path:SubPath, ctx:Koa.Context) {

		if (ctx.method === 'GET') {
			const localPath = await findLocalFile(path.raw);

			let mimeType:string = mime.fromFilename(localPath);
			if (!mimeType) mimeType = 'application/octet-stream';

			const fileContent:Buffer = await fs.readFile(localPath);

			const koaResponse = ctx.response;
			koaResponse.body = fileContent;
			koaResponse.set('Content-Type', mimeType);
			koaResponse.set('Content-Length', fileContent.length.toString());
			return new ApiResponse(ApiResponseType.KoaResponse, koaResponse);
		}

		throw new ErrorMethodNotAllowed();
	},

};

export default route;
