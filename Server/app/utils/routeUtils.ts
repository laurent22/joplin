const { ltrimSlashes, rtrimSlashes } = require('lib/path-utils');

export interface Routes {
	[key: string]: Function,
}

export interface SubPath {
	id?: string
	link?: string
}

export interface MatchedRoute {
	route: Function,
	basePath: string,
	subPath: SubPath,
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
