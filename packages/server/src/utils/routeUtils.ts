import { File, ItemAddressingType } from '../db';
import { ErrorBadRequest } from './errors';
import Router from './Router';
import { AppContext } from './types';

const { ltrimSlashes, rtrimSlashes } = require('@joplin/lib/path-utils');

function dirname(path: string): string {
	if (!path) throw new Error('Path is empty');
	const s = path.split('/');
	s.pop();
	return s.join('/');
}

function basename(path: string): string {
	if (!path) throw new Error('Path is empty');
	const s = path.split('/');
	return s[s.length - 1];
}

export enum RouteResponseFormat {
	Html = 'html',
	Json = 'json',
}

export type RouteHandler = (path: SubPath, ctx: AppContext, ...args: any[])=> Promise<any>;

export interface Routers {
	[key: string]: Router;
}

export interface SubPath {
	id: string;
	link: string;
	addressingType: ItemAddressingType;
	raw: string;
	schema: string;
}

export interface MatchedRoute {
	route: Router;
	basePath: string;
	subPath: SubPath;
}

export enum ResponseType {
	KoaResponse,
	Object,
}

export class Response {
	public type: ResponseType;
	public response: any;

	public constructor(type: ResponseType, response: any) {
		this.type = type;
		this.response = response;
	}
}

function removeTrailingColon(path: string): string {
	if (!path || !path.length) return '';
	if (path[path.length - 1] === ':') return path.substr(0, path.length - 1);
	return path;
}

export interface PathInfo {
	basename: string;
	dirname: string;
}

export function redirect(ctx: AppContext, url: string): Response {
	ctx.redirect(url);
	ctx.response.status = 302;
	return new Response(ResponseType.KoaResponse, ctx.response);
}

export function filePathInfo(path: string): PathInfo {
	return {
		basename: removeTrailingColon(basename(path)),
		dirname: removeTrailingColon(dirname(path)),
	};
}

// root:/Documents/MyFile.md
export function splitItemPath(path: string): string[] {
	if (!path) return [];

	const output = path.split('/');
	// Remove trailing ":" from root dir
	if (output.length) {
		output[0] = removeTrailingColon(output[0]);
		output[output.length - 1] = removeTrailingColon(output[output.length - 1]);
	}

	return output;
}

// Converts root:/path/to/file.md to /path/to/file.md
export function removeFilePathPrefix(path: string): string {
	if (!path || path.indexOf(':') < 0) return path;
	const p = path.split(':');
	return p[1];
}

export function isPathBasedAddressing(fileId: string): boolean {
	if (!fileId) return false;
	return fileId.indexOf(':') >= 0;
}

// Allows parsing the two types of paths supported by the API:
//
// root:/Documents/MyFile.md:/content
// ABCDEFG/content
export function parseSubPath(basePath: string, p: string): SubPath {
	p = rtrimSlashes(ltrimSlashes(p));

	const output: SubPath = {
		id: '',
		link: '',
		addressingType: ItemAddressingType.Id,
		raw: p,
		schema: '',
	};

	const colonIndex1 = p.indexOf(':');
	if (colonIndex1 > 0) {
		output.addressingType = ItemAddressingType.Path;

		const colonIndex2 = p.indexOf(':', colonIndex1 + 1);

		if (colonIndex2 < 0) {
			throw new ErrorBadRequest(`Invalid path format: ${p}`);
		} else {
			output.id = p.substr(0, colonIndex2 + 1);
			output.link = ltrimSlashes(p.substr(colonIndex2 + 1));
		}
	} else {
		const s = p.split('/');
		if (s.length >= 1) output.id = s[0];
		if (s.length >= 2) output.link = s[1];
	}

	if (basePath) {
		const schema = [basePath];
		if (output.id) schema.push(':id');
		if (output.link) schema.push(output.link);
		output.schema = schema.join('/');
	}

	return output;
}

export function routeResponseFormat(match: MatchedRoute, context: AppContext): RouteResponseFormat {
	const rawPath = context.path;
	if (match && match.route.responseFormat) return match.route.responseFormat;

	let path = rawPath;
	if (match) path = match.basePath ? match.basePath : match.subPath.raw;

	return path.indexOf('api') === 0 || path.indexOf('/api') === 0 ? RouteResponseFormat.Json : RouteResponseFormat.Html;
}

// In a path such as "/api/files/SOME_ID/content" we want to find:
// - The base path: "api/files"
// - The ID: "SOME_ID"
// - The link: "content"
export function findMatchingRoute(path: string, routes: Routers): MatchedRoute {
	const splittedPath = path.split('/');

	// Because the path starts with "/", we remove the first element, which is
	// an empty string. So for example we now have ['api', 'files', 'SOME_ID', 'content'].
	splittedPath.splice(0, 1);

	if (splittedPath.length >= 2) {
		// Create the base path, eg. "api/files", to match it to one of the
		// routes.s
		const basePath = `${splittedPath[0]}/${splittedPath[1]}`;
		if (routes[basePath]) {
			// Remove the base path from the array so that parseSubPath() can
			// extract the ID and link from the URL. So the array will contain
			// at this point: ['SOME_ID', 'content'].
			splittedPath.splice(0, 2);
			return {
				route: routes[basePath],
				basePath: basePath,
				subPath: parseSubPath(basePath, `/${splittedPath.join('/')}`),
			};
		}
	}

	const basePath = splittedPath[0];
	if (routes[basePath]) {
		splittedPath.splice(0, 1);
		return {
			route: routes[basePath],
			basePath: basePath,
			subPath: parseSubPath(basePath, `/${splittedPath.join('/')}`),
		};
	}

	if (routes['']) {
		return {
			route: routes[''],
			basePath: '',
			subPath: parseSubPath('', `/${splittedPath.join('/')}`),
		};
	}

	throw new Error('Unreachable');
}

export function respondWithFileContent(koaResponse: any, file: File): Response {
	koaResponse.body = file.content;
	koaResponse.set('Content-Type', file.mime_type);
	koaResponse.set('Content-Length', file.size.toString());
	return new Response(ResponseType.KoaResponse, koaResponse);
}
