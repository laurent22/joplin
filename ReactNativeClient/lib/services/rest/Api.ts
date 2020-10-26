import Logger from 'lib/Logger';
import shim from 'lib/shim';
import { PaginationOrderDir } from 'lib/models/utils/types';
import readonlyProperties from './readonlyProperties';
import requestFields from './requestFields';
import defaultAction from './defaultAction';
import BaseModel, { ModelType } from 'lib/BaseModel';
import defaultLoadOptions from './defaultLoadOptions';

import route_folders from './routes/folders';
import route_notes from './routes/notes';

const { ltrimSlashes } = require('lib/path-utils');
const Note = require('lib/models/Note');
const Tag = require('lib/models/Tag');
const BaseItem = require('lib/models/BaseItem');
const Resource = require('lib/models/Resource');
const md5 = require('md5');
const ApiResponse = require('lib/services/rest/ApiResponse');
const SearchEngineUtils = require('lib/services/searchengine/SearchEngineUtils');
const { ErrorMethodNotAllowed, ErrorForbidden, ErrorBadRequest, ErrorNotFound } = require('./errors');

export enum RequestMethod {
	GET = 'GET',
	POST = 'post',
	PUT = 'PUT',
	DELETE = 'DELETE',
}

interface RequestFile {
	path: string,
}

interface RequestQuery {
	cursor?: string,
	fields?: string[] | string,
	token?: string,
	nounce?: string,

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

interface ResourceNameToRoute {
	[key:string]: Function,
}

export default class Api {

	private token_:string | Function;
	private knownNounces_:any = {};
	// private logger_:Logger;
	private actionApi_:any;
	// private htmlToMdParser_:any;
	private resourceNameToRoute_:ResourceNameToRoute = {};

	public constructor(token:string = null, actionApi:any = null) {
		this.token_ = token;
		// this.logger_ = new Logger();
		this.actionApi_ = actionApi;

		this.resourceNameToRoute_ = {
			ping: this.action_ping.bind(this),
			notes: route_notes,
			folders: route_folders,
			tags: this.action_tags.bind(this),
			resources: this.action_resources.bind(this),
			master_keys: this.action_master_keys.bind(this),
			services: this.action_services.bind(this),
			search: this.action_search.bind(this),
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

	public setLogger(_l:Logger) {
		// this.logger_ = l;
	}

	// private logger() {
	// 	return this.logger_;
	// }

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

	private async action_ping(request:Request) {
		if (request.method === 'GET') {
			return 'JoplinClipperServer';
		}

		throw new ErrorMethodNotAllowed();
	}

	private async action_search(request:Request) {
		if (request.method !== 'GET') throw new ErrorMethodNotAllowed();

		const query = request.query.query;
		if (!query) throw new ErrorBadRequest('Missing "query" parameter');

		const modelType = request.query.type ? BaseModel.modelNameToType(request.query.type) : BaseModel.TYPE_NOTE;

		let results = [];

		if (modelType !== BaseItem.TYPE_NOTE) {
			const ModelClass = BaseItem.getClassByItemType(modelType);
			const options:any = {};
			const fields = requestFields(request, modelType);
			if (fields.length) options.fields = fields;
			const sqlQueryPart = query.replace(/\*/g, '%');
			options.where = 'title LIKE ?';
			options.whereParams = [sqlQueryPart];
			options.caseInsensitive = true;
			results = await ModelClass.all(options);
		} else {
			results = await SearchEngineUtils.notesForQuery(query, defaultLoadOptions(request, ModelType.note));
		}

		return {
			rows: results,
			// TODO: implement cursor support
		};
	}

	private async action_tags(request:Request, id:string = null, link:string = null) {
		if (link === 'notes') {
			const tag = await Tag.load(id);
			if (!tag) throw new ErrorNotFound();

			if (request.method === RequestMethod.POST) {
				const note = request.bodyJson();
				if (!note || !note.id) throw new ErrorBadRequest('Missing note ID');
				return await Tag.addNote(tag.id, note.id);
			}

			if (request.method === 'DELETE') {
				const noteId = request.params.length ? request.params[0] : null;
				if (!noteId) throw new ErrorBadRequest('Missing note ID');
				await Tag.removeNote(tag.id, noteId);
				return;
			}

			if (request.method === 'GET') {
				// Ideally we should get all this in one SQL query but for now that will do
				const noteIds = await Tag.noteIds(tag.id);
				const output = [];
				for (let i = 0; i < noteIds.length; i++) {
					const n = await Note.preview(noteIds[i], defaultLoadOptions(request, ModelType.note));
					if (!n) continue;
					output.push(n);
				}
				return { rows: output }; // TODO: paginate
			}
		}

		return defaultAction(BaseModel.TYPE_TAG, request, id, link);
	}

	private async action_master_keys(request:Request, id:string = null, link:string = null) {
		return defaultAction(BaseModel.TYPE_MASTER_KEY, request, id, link);
	}

	private async action_resources(request:Request, id:string = null, link:string = null) {
		// fieldName: "data"
		// headers: Object
		// originalFilename: "test.jpg"
		// path: "C:\Users\Laurent\AppData\Local\Temp\BW77wkpP23iIGUstd0kDuXXC.jpg"
		// size: 164394

		if (request.method === 'GET') {
			if (link === 'file') {
				const resource = await Resource.load(id);
				if (!resource) throw new ErrorNotFound();

				const filePath = Resource.fullPath(resource);
				const buffer = await shim.fsDriver().readFile(filePath, 'Buffer');

				const response = new ApiResponse();
				response.type = 'attachment';
				response.body = buffer;
				response.contentType = resource.mime;
				response.attachmentFilename = Resource.friendlyFilename(resource);
				return response;
			}

			if (link) throw new ErrorNotFound();
		}

		if (request.method === RequestMethod.POST) {
			if (!request.files.length) throw new ErrorBadRequest('Resource cannot be created without a file');
			const filePath = request.files[0].path;
			const defaultProps = request.bodyJson(readonlyProperties('POST'));
			return shim.createResourceFromPath(filePath, defaultProps, { userSideValidation: true });
		}

		return defaultAction(BaseModel.TYPE_RESOURCE, request, id, link);
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
