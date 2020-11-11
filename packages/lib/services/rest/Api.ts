import { PaginationOrderDir } from '../../models/utils/types';
import { ErrorMethodNotAllowed, ErrorForbidden, ErrorBadRequest, ErrorNotFound } from './utils/errors';

import route_folders from './routes/folders';
import route_notes from './routes/notes';
import route_resources from './routes/resources';
import route_tags from './routes/tags';
import route_master_keys from './routes/master_keys';
import route_search from './routes/search';
import route_ping from './routes/ping';

const { ltrimSlashes } = require('../../path-utils');
const md5 = require('md5');

export enum RequestMethod {
	GET = 'GET',
	POST = 'POST',
	PUT = 'PUT',
	DELETE = 'DELETE',
}

interface RequestFile {
	path: string,
}

interface RequestQuery {
	fields?: string[] | string,
	token?: string,
	nounce?: string,
	page?: number,

	// Search engine query
	query?: string,
	type?: string, // Model type as a string (eg. "note", "folder")

	as_tree?: number,

	// Pagination
	limit?: number,
	order_dir?: PaginationOrderDir,
	order_by?: string,
}

export interface Request {
	method: RequestMethod,
	path: string,
	query: RequestQuery,
	body: any,
	bodyJson_: any,
	bodyJson: any,
	files: RequestFile[],
	params: any[],
	action?: any,
}

type RouteFunction = (request:Request, id:string, link:string) => Promise<any | void>;

interface ResourceNameToRoute {
	[key:string]: RouteFunction;
}

export default class Api {

	private token_:string | Function;
	private knownNounces_:any = {};
	private actionApi_:any;
	private resourceNameToRoute_:ResourceNameToRoute = {};

	public constructor(token:string = null, actionApi:any = null) {
		this.token_ = token;
		this.actionApi_ = actionApi;

		this.resourceNameToRoute_ = {
			ping: route_ping,
			notes: route_notes,
			folders: route_folders,
			tags: route_tags,
			resources: route_resources,
			master_keys: route_master_keys,
			search: route_search,
			services: this.action_services.bind(this),
		};
	}

	public get token() {
		return typeof this.token_ === 'function' ? this.token_() : this.token_;
	}

	private parsePath(path:string) {
		path = ltrimSlashes(path);
		if (!path) return { fn: null, params: [] };

		const pathParts = path.split('/');
		const callSuffix = pathParts.splice(0, 1)[0];
		const fn = this.resourceNameToRoute_[callSuffix];

		return {
			fn: fn,
			params: pathParts,
		};
	}

	// Response can be any valid JSON object, so a string, and array or an object (key/value pairs).
	public async route(method:RequestMethod, path:string, query:RequestQuery = null, body:any = null, files:RequestFile[] = null):Promise<any> {
		if (!files) files = [];
		if (!query) query = {};

		const parsedPath = this.parsePath(path);
		if (!parsedPath.fn) throw new ErrorNotFound(); // Nothing at the root yet

		if (query && query.nounce) {
			const requestMd5 = md5(JSON.stringify([method, path, body, query, files.length]));
			if (this.knownNounces_[query.nounce] === requestMd5) {
				throw new ErrorBadRequest('Duplicate Nounce');
			}
			this.knownNounces_[query.nounce] = requestMd5;
		}

		let id = null;
		let link = null;
		const params = parsedPath.params;

		if (params.length >= 1) {
			id = params[0];
			params.splice(0, 1);
			if (params.length >= 1) {
				link = params[0];
				params.splice(0, 1);
			}
		}

		const request:Request = {
			method,
			path: ltrimSlashes(path),
			query: query ? query : {},
			body,
			bodyJson_: null,
			bodyJson: function(disallowedProperties:string[] = null) {
				if (!this.bodyJson_) this.bodyJson_ = JSON.parse(this.body);

				if (disallowedProperties) {
					const filteredBody = Object.assign({}, this.bodyJson_);
					for (let i = 0; i < disallowedProperties.length; i++) {
						const n = disallowedProperties[i];
						delete filteredBody[n];
					}
					return filteredBody;
				}

				return this.bodyJson_;
			},
			files,
			params,
		};

		this.checkToken_(request);

		try {
			return await parsedPath.fn(request, id, link);
		} catch (error) {
			if (!error.httpCode) error.httpCode = 500;
			throw error;
		}
	}

	private checkToken_(request:Request) {
		// For now, whitelist some calls to allow the web clipper to work
		// without an extra auth step
		const whiteList = [['GET', 'ping'], ['GET', 'tags'], ['GET', 'folders'], ['POST', 'notes']];

		for (let i = 0; i < whiteList.length; i++) {
			if (whiteList[i][0] === request.method && whiteList[i][1] === request.path) return;
		}

		if (!this.token) return;
		if (!request.query || !request.query.token) throw new ErrorForbidden('Missing "token" parameter');
		if (request.query.token !== this.token) throw new ErrorForbidden('Invalid "token" parameter');
	}

	private async execServiceActionFromRequest_(externalApi:any, request:Request) {
		const action = externalApi[request.action];
		if (!action) throw new ErrorNotFound(`Invalid action: ${request.action}`);
		const args = Object.assign({}, request);
		delete args.action;
		return action(args);
	}

	private async action_services(request:Request, serviceName:string) {
		if (request.method !== RequestMethod.POST) throw new ErrorMethodNotAllowed();
		if (!this.actionApi_) throw new ErrorNotFound('No action API has been setup!');
		if (!this.actionApi_[serviceName]) throw new ErrorNotFound(`No such service: ${serviceName}`);

		const externalApi = this.actionApi_[serviceName]();
		return this.execServiceActionFromRequest_(externalApi, JSON.parse(request.body));
	}

}
