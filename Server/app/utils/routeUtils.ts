import { ItemId, ItemAddressingType } from '../db';

const { ltrimSlashes, rtrimSlashes } = require('lib/path-utils');

export interface Route {
	exec: Function,
	needsBodyMiddleware?: boolean
}

export interface Routes {
	[key: string]: Route,
}

export interface SubPath extends ItemId {
	link: string
}

export interface MatchedRoute {
	route: Route,
	basePath: string,
	subPath: SubPath,
}

export enum ApiResponseType {
	KoaResponse,
	Object
}

export class ApiResponse {
	type: ApiResponseType
	response: any

	constructor(type:ApiResponseType, response:any) {
		this.type = type;
		this.response = response;
	}
}

// root:/Documents/MyFile.md
export function splitItemPath(path:string):string[] {
	if (!path) return [];

	const output = path.split('/');
	// Remove trailing ":" from root dir
	if (output.length && output[0][output[0].length - 1] === ':') output[0] = output[0].substr(0, output[0].length - 1);
	return output;
}

// Converts root:/path/to/file.md to /path/to/file.md
export function removeFilePathPrefix(path:string):string {
	if (!path || path.indexOf(':') < 0) return path;
	const p = path.split(':');
	return p[1];
}

// Allows parsing the two types of paths supported by the API:
//
// root:/Documents/MyFile.md:/content
// ABCDEFG/content
export function parseSubPath(p:string):SubPath {
	p = rtrimSlashes(ltrimSlashes(p));

	const output:SubPath = {
		value: '',
		link: '',
		addressingType: ItemAddressingType.Id,
	};

	const prefix = 'root:';
	if (p.indexOf(prefix) === 0) {
		output.addressingType = ItemAddressingType.Path;

		const secondIdx = p.indexOf(':', prefix.length);

		if (secondIdx < 0) {
			output.value = p;
		} else {
			output.value = p.substr(0, secondIdx);
			output.link = ltrimSlashes(p.substr(secondIdx + 1));
		}
	} else {
		const s = p.split('/');
		if (s.length >= 1) output.value = s[0];
		if (s.length >= 2) output.link = s[1];
	}

	return output;
}

export function findMatchingRoute(path:string, routes:Routes):MatchedRoute {
	let splittedPath = path.split('/');
	splittedPath.splice(0, 1);

	if (splittedPath.length >= 2) {
		const basePath = `${splittedPath[0]}/${splittedPath[1]}`;
		if (routes[basePath]) {
			splittedPath.splice(0, 2);
			return {
				route: routes[basePath],
				basePath: basePath,
				subPath: parseSubPath(`/${splittedPath.join('/')}`),
			};
		}
	}

	const basePath = splittedPath[0];
	if (routes[basePath]) {
		splittedPath.splice(0, 1);
		return {
			route: routes[basePath],
			basePath: basePath,
			subPath: parseSubPath(`/${splittedPath.join('/')}`),
		};
	}

	return null;
}
