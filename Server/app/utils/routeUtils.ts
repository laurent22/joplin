const { ltrimSlashes, rtrimSlashes } = require('lib/path-utils');

export interface Route {
	exec: Function,
	needsBodyMiddleware?: boolean
}

export interface Routes {
	[key: string]: Route,
}

export interface SubPath {
	id?: string
	link?: string
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

function parseSubPath(p:string):SubPath {
	const s = rtrimSlashes(ltrimSlashes(p)).split('/');
	const output:SubPath = {};
	if (s.length >= 1) output.id = s[0];
	if (s.length >= 2) output.link = s[1];
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
