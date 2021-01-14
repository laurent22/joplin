import * as Koa from 'koa';
import { SubPath, Response, ResponseType } from '../utils/routeUtils';
import Router from '../utils/Router';
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
// example if they are in node_modules, use the map below.
const pathToFileMap: PathToFileMap = {
	'css/bulma.min.css': 'node_modules/bulma/css/bulma.min.css',
	'css/bulma-prefers-dark.min.css': 'node_modules/bulma-prefers-dark/css/bulma-prefers-dark.min.css',
	'css/fontawesome/css/all.min.css': 'node_modules/@fortawesome/fontawesome-free/css/all.min.css',
};

async function findLocalFile(path: string): Promise<string> {
	if (path in pathToFileMap) return pathToFileMap[path];
	// For now a bit of a hack to load FontAwesome fonts.
	if (path.indexOf('css/fontawesome/webfonts/fa-') === 0) return `node_modules/@fortawesome/fontawesome-free/${path.substr(16)}`;

	let localPath = normalize(path);
	if (localPath.indexOf('..') >= 0) throw new ErrorNotFound(`Cannot resolve path: ${path}`);
	localPath = `${publicDir}/${localPath}`;
	if (!(await pathExists(localPath))) throw new ErrorNotFound(`Path not found: ${path}`);

	const stat = await fs.stat(localPath);
	if (stat.isDirectory()) throw new ErrorForbidden(`Directory listing not allowed: ${path}`);

	return localPath;
}

const router = new Router();

router.get('', async (path: SubPath, ctx: Koa.Context) => {
	const localPath = await findLocalFile(path.raw);

	let mimeType: string = mime.fromFilename(localPath);
	if (!mimeType) mimeType = 'application/octet-stream';

	const fileContent: Buffer = await fs.readFile(localPath);

	const koaResponse = ctx.response;
	koaResponse.body = fileContent;
	koaResponse.set('Content-Type', mimeType);
	koaResponse.set('Content-Length', fileContent.length.toString());
	return new Response(ResponseType.KoaResponse, koaResponse);
});

export default router;
