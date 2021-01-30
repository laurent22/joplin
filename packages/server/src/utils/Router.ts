import { ErrorMethodNotAllowed, ErrorNotFound } from './errors';
import { HttpMethod } from './types';
import { RouteResponseFormat, RouteHandler } from './routeUtils';

export default class Router {

	public public: boolean = false;
	public responseFormat: RouteResponseFormat = null;

	private routes_: Record<string, Record<string, RouteHandler>> = {};
	private aliases_: Record<string, Record<string, string>> = {};

	public findEndPoint(method: HttpMethod, schema: string): RouteHandler {
		if (this.aliases_[method]?.[schema]) { return this.findEndPoint(method, this.aliases_[method]?.[schema]); }

		if (!this.routes_[method]) { throw new ErrorMethodNotAllowed(`Not allowed: ${method} ${schema}`); }
		const endPoint = this.routes_[method][schema];
		if (!endPoint) { throw new ErrorNotFound(`Not found: ${method} ${schema}`); }

		let endPointFn = endPoint;
		for (let i = 0; i < 1000; i++) {
			if (typeof endPointFn === 'string') {
				endPointFn = this.routes_[method]?.[endPointFn];
			} else {
				return endPointFn;
			}
		}

		throw new ErrorNotFound(`Could not resolve: ${method} ${schema}`);
	}

	public alias(method: HttpMethod, path: string, target: string) {
		if (!this.aliases_[method]) { this.aliases_[method] = {}; }
		this.aliases_[method][path] = target;
	}

	public get(path: string, handler: RouteHandler) {
		if (!this.routes_.GET) { this.routes_.GET = {}; }
		this.routes_.GET[path] = handler;
	}

	public post(path: string, handler: RouteHandler) {
		if (!this.routes_.POST) { this.routes_.POST = {}; }
		this.routes_.POST[path] = handler;
	}

	public patch(path: string, handler: RouteHandler) {
		if (!this.routes_.PATCH) { this.routes_.PATCH = {}; }
		this.routes_.PATCH[path] = handler;
	}

	public del(path: string, handler: RouteHandler) {
		if (!this.routes_.DELETE) { this.routes_.DELETE = {}; }
		this.routes_.DELETE[path] = handler;
	}

	public put(path: string, handler: RouteHandler) {
		if (!this.routes_.PUT) { this.routes_.PUT = {}; }
		this.routes_.PUT[path] = handler;
	}

}
