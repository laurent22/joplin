import * as Koa from 'koa';
import { SubPath, Route, Response, ResponseType } from '../utils/routeUtils';
import { ErrorNotFound, ErrorForbidden } from '../utils/errors';
import { dirname, normalize } from 'path';
import { pathExists } from 'fs-extra';
import * as fs from 'fs-extra';
const { mime } = require('@joplin/lib/mime-utils.js');

const publicDir = `${dirname(dirname(__dirname))}/public`;

interface PathToFileMap {
	[path: string]: string;
}

// Most static assets should be in /public, but for those that are not, for
// example if they are in node_modules, use the map below
const pathToFileMap: PathToFileMap = {
	'css/bulma.min.css': 'node_modules/bulma/css/bulma.min.css',
	'css/bulma-prefers-dark.min.css': 'node_modules/bulma-prefers-dark/css/bulma-prefers-dark.min.css',
};

async function findLocalFile(path: string): Promise<string> {
	if (path in pathToFileMap) return pathToFileMap[path];

	let localPath = normalize(path);
	if (localPath.indexOf('..') >= 0) throw new ErrorNotFound(`Cannot resolve path: ${path}`);
	localPath = `${publicDir}/${localPath}`;
	if (!(await pathExists(localPath))) throw new ErrorNotFound(`Path not found: ${path}`);

	const stat = await fs.stat(localPath);
	if (stat.isDirectory()) throw new ErrorForbidden(`Directory listing not allowed: ${path}`);

	return localPath;
}

const route: Route = {

	exec: async function(path: SubPath, ctx: Koa.Context) {

		if (ctx.method === 'GET') {
			const localPath = await findLocalFile(path.raw);

			let mimeType: string = mime.fromFilename(localPath);
			if (!mimeType) mimeType = 'application/octet-stream';

			const fileContent: Buffer = await fs.readFile(localPath);

			const koaResponse = ctx.response;
			koaResponse.body = fileContent;
			koaResponse.set('Content-Type', mimeType);
			koaResponse.set('Content-Length', fileContent.length.toString());
			return new Response(ResponseType.KoaResponse, koaResponse);
		}

		throw new ErrorNotFound();
	},

};

export default route;
