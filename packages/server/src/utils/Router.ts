import { ErrorMethodNotAllowed, ErrorNotFound } from './errors';
import { HttpMethod, RouteType } from './types';
import { RouteResponseFormat, RouteHandler } from './routeUtils';

interface RouteInfo {
	handler: RouteHandler;
	type?: RouteType;
}

export default class Router {

	// When the router is public, we do not check that a valid session is
	// available (that ctx.joplin.owner is defined). It means by default any user, even
	// not logged in, can access any route of this router. End points that
	// should not be publicly available should call ownerRequired(ctx);
	public public = false;
	public publicSchemas: string[] = [];

	public responseFormat: RouteResponseFormat = null;

	private routes_: Record<string, Record<string, RouteInfo>> = {};
	private aliases_: Record<string, Record<string, string>> = {};
	private type_: RouteType;

	public constructor(type: RouteType) {
		this.type_ = type;
	}

	public findEndPoint(method: HttpMethod, schema: string): RouteInfo {
		if (this.aliases_[method]?.[schema]) { return this.findEndPoint(method, this.aliases_[method]?.[schema]); }

		if (!this.routes_[method]) { throw new ErrorMethodNotAllowed(`Not allowed: ${method} ${schema}`); }
		const endPoint = this.routes_[method][schema];
		if (!endPoint) { throw new ErrorNotFound(`Not found: ${method} ${schema}`); }

		let endPointInfo = endPoint;
		for (let i = 0; i < 1000; i++) {
			if (typeof endPointInfo === 'string') {
				endPointInfo = this.routes_[method]?.[endPointInfo];
			} else {
				const output = { ...endPointInfo };
				if (!output.type) output.type = this.type_;
				return output;
			}
		}

		throw new ErrorNotFound(`Could not resolve: ${method} ${schema}`);
	}

	public isPublic(schema: string): boolean {
		return this.public || this.publicSchemas.includes(schema);
	}

	public alias(method: HttpMethod, path: string, target: string) {
		if (!this.aliases_[method]) { this.aliases_[method] = {}; }
		this.aliases_[method][path] = target;
	}

	public get(path: string, handler: RouteHandler, type: RouteType = null) {
		if (!this.routes_.GET) { this.routes_.GET = {}; }
		this.routes_.GET[path] = { handler, type };
	}

	public post(path: string, handler: RouteHandler, type: RouteType = null) {
		if (!this.routes_.POST) { this.routes_.POST = {}; }
		this.routes_.POST[path] = { handler, type };
	}

	public patch(path: string, handler: RouteHandler, type: RouteType = null) {
		if (!this.routes_.PATCH) { this.routes_.PATCH = {}; }
		this.routes_.PATCH[path] = { handler, type };
	}

	public del(path: string, handler: RouteHandler, type: RouteType = null) {
		if (!this.routes_.DELETE) { this.routes_.DELETE = {}; }
		this.routes_.DELETE[path] = { handler, type };
	}

	public put(path: string, handler: RouteHandler, type: RouteType = null) {
		if (!this.routes_.PUT) { this.routes_.PUT = {}; }
		this.routes_.PUT[path] = { handler, type };
	}

}
