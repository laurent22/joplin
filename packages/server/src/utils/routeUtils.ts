import config, { baseUrl } from '../config';
import { Item, ItemAddressingType, User, Uuid } from '../services/database/types';
import { ErrorBadRequest, ErrorCode, ErrorForbidden, ErrorNotFound } from './errors';
import Router from './Router';
import { AppContext, HttpMethod, RouteType } from './types';
import { URL } from 'url';
import { csrfCheck } from './csrf';
import { contextSessionId } from './requestUtils';
import { stripOffQueryParameters } from './urlUtils';

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

export const urlMatchesSchema = (url: string, schema: string): boolean => {
	url = stripOffQueryParameters(url);
	const regex = new RegExp(`${schema.replace(/:id/, '[a-zA-Z0-9]+')}$`);
	return !!url.match(regex);
};

// Allows parsing the two types of paths supported by the API:
//
// root:/Documents/MyFile.md:/content
// ABCDEFG/content
export function parseSubPath(basePath: string, p: string, rawPath: string = null): SubPath {
	p = rtrimSlashes(ltrimSlashes(p));

	const output: SubPath = {
		id: '',
		link: '',
		addressingType: ItemAddressingType.Id,
		raw: rawPath === null ? p : ltrimSlashes(rawPath),
		schema: '',
	};

	const colonIndex1 = p.indexOf(':');
	if (colonIndex1 > 0) {
		output.addressingType = ItemAddressingType.Path;

		const colonIndex2 = p.indexOf(':', colonIndex1 + 1);

		if (colonIndex2 < 0) {
			throw new ErrorBadRequest(`Invalid path format: ${p}`);
		} else {
			output.id = decodeURIComponent(p.substr(0, colonIndex2 + 1));
			output.link = ltrimSlashes(p.substr(colonIndex2 + 1));
		}
	} else {
		const s = p.split('/');
		if (s.length >= 1) output.id = decodeURIComponent(s[0]);
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

export function isValidOrigin(requestOrigin: string, endPointBaseUrl: string, routeType: RouteType): boolean {
	const host1 = (new URL(requestOrigin)).host;
	const host2 = (new URL(endPointBaseUrl)).host;

	if (routeType === RouteType.UserContent) {
		// At this point we only check if eg usercontent.com has been accessed
		// with origin usercontent.com, or something.usercontent.com. We don't
		// check that the user ID is valid or is event present. This will be
		// done by the /share end point, which will also check that the share
		// owner ID matches the origin URL.
		if (host1 === host2) return true;
		const hostNoPrefix = host1.split('.').slice(1).join('.');
		return hostNoPrefix === host2;
	} else {
		return host1 === host2;
	}
}

export function userIdFromUserContentUrl(url: string): Uuid {
	const s = (new URL(url)).hostname.split('.');
	return s[0].toLowerCase();
}

export function routeResponseFormat(context: AppContext): RouteResponseFormat {
	const path = context.path;
	return path.indexOf('api') === 0 || path.indexOf('/api') === 0 ? RouteResponseFormat.Json : RouteResponseFormat.Html;
}

function disabledAccountCheck(route: MatchedRoute, user: User) {
	if (!user || user.enabled) return;

	if (route.subPath.schema.startsWith('api/')) throw new ErrorForbidden(`This account is disabled. Please login to ${config().baseUrl} for more information.`);
}

interface ExecRequestResult {
	response: any;
	path: SubPath;
}

export async function execRequest(routes: Routers, ctx: AppContext): Promise<ExecRequestResult> {
	const match = findMatchingRoute(ctx.path, routes);
	if (!match) throw new ErrorNotFound();

	const endPoint = match.route.findEndPoint(ctx.request.method as HttpMethod, match.subPath.schema);
	if (ctx.URL && !isValidOrigin(ctx.URL.origin, baseUrl(endPoint.type), endPoint.type)) throw new ErrorNotFound(`Invalid origin: ${ctx.URL.origin}`, ErrorCode.InvalidOrigin);

	const isPublicRoute = match.route.isPublic(match.subPath.schema);

	// This is a generic catch-all for all private end points - if we
	// couldn't get a valid session, we exit now. Individual end points
	// might have additional permission checks depending on the action.
	if (!isPublicRoute && !ctx.joplin.owner) {
		if (contextSessionId(ctx, false)) {
			// If we have a session but not a user it means the session was
			// invalid or has expired, so display a special message, since this
			// is also going to be displayed on the website.
			throw new ErrorForbidden('Your session has expired. Please login again.');
		} else {
			throw new ErrorForbidden();
		}
	}

	await csrfCheck(ctx, isPublicRoute);
	disabledAccountCheck(match, ctx.joplin.owner);

	return {
		response: await endPoint.handler(match.subPath, ctx),
		path: match.subPath,
	};
}

// In a path such as "/api/files/SOME_ID/content" we want to find:
// - The base path: "api/files"
// - The ID: "SOME_ID"
// - The link: "content"
export function findMatchingRoute(path: string, routes: Routers): MatchedRoute {
	// Enforce that path starts with "/" because if it doesn't, the function
	// will return strange but valid results.
	if (path.length && path[0] !== '/') throw new Error(`Expected path to start with "/": ${path}`);

	const splittedPath = path.split('/');

	// Because the path starts with "/", we remove the first element, which is
	// an empty string. So for example we now have ['api', 'files', 'SOME_ID', 'content'].
	splittedPath.splice(0, 1);

	let namespace = '';
	if (splittedPath[0] === 'apps') {
		namespace = splittedPath.splice(0, 2).join('/');
	}

	// Paths such as "/api/files/:id" will be processed here
	if (splittedPath.length >= 2) {
		// Create the base path, eg. "api/files", to match it to one of the
		// routes.
		const basePath = `${namespace ? `${namespace}/` : ''}${splittedPath[0]}/${splittedPath[1]}`;
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

	// Paths such as "/users/:id" or "/apps/joplin/notes/:id" will get here
	const basePath = splittedPath[0];
	const basePathNS = (namespace ? `${namespace}/` : '') + basePath;
	if (routes[basePathNS]) {
		splittedPath.splice(0, 1);
		return {
			route: routes[basePathNS],
			basePath: basePath,
			subPath: parseSubPath(basePath, `/${splittedPath.join('/')}`),
		};
	}

	// Default routes - to process CSS or JS files for example
	if (routes['']) {
		return {
			route: routes[''],
			basePath: '',
			subPath: parseSubPath('', `/${splittedPath.join('/')}`, path),
		};
	}

	throw new Error('Unreachable');
}

export function respondWithItemContent(koaResponse: any, item: Item, content: Buffer): Response {
	koaResponse.body = item.jop_type > 0 ? content.toString() : content;
	koaResponse.set('Content-Type', item.mime_type);
	koaResponse.set('Content-Length', content.byteLength);
	return new Response(ResponseType.KoaResponse, koaResponse);
}

export enum UrlType {
	Signup = 'signup',
	Login = 'login',
	Terms = 'terms',
	Privacy = 'privacy',
	Tasks = 'admin/tasks',
	UserDeletions = 'admin/user_deletions',
}

export function makeUrl(urlType: UrlType): string {
	if (config().isJoplinCloud && urlType === UrlType.Signup) {
		return `${config().joplinAppBaseUrl}/plans`;
	} else {
		return `${baseUrl(RouteType.Web)}/${urlType}`;
	}
}
