"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const errors_1 = require("./errors");
class Router {
    constructor(type) {
        // When the router is public, we do not check that a valid session is
        // available (that ctx.joplin.owner is defined). It means by default any user, even
        // not logged in, can access any route of this router. End points that
        // should not be publicly available should call ownerRequired(ctx);
        this.public = false;
        this.publicSchemas = [];
        this.responseFormat = null;
        this.routes_ = {};
        this.aliases_ = {};
        this.type_ = type;
    }
    findEndPoint(method, schema) {
        var _a, _b, _c;
        if ((_a = this.aliases_[method]) === null || _a === void 0 ? void 0 : _a[schema]) {
            return this.findEndPoint(method, (_b = this.aliases_[method]) === null || _b === void 0 ? void 0 : _b[schema]);
        }
        if (!this.routes_[method]) {
            throw new errors_1.ErrorMethodNotAllowed(`Not allowed: ${method} ${schema}`);
        }
        const endPoint = this.routes_[method][schema];
        if (!endPoint) {
            throw new errors_1.ErrorNotFound(`Not found: ${method} ${schema}`);
        }
        let endPointInfo = endPoint;
        for (let i = 0; i < 1000; i++) {
            if (typeof endPointInfo === 'string') {
                endPointInfo = (_c = this.routes_[method]) === null || _c === void 0 ? void 0 : _c[endPointInfo];
            }
            else {
                const output = Object.assign({}, endPointInfo);
                if (!output.type)
                    output.type = this.type_;
                return output;
            }
        }
        throw new errors_1.ErrorNotFound(`Could not resolve: ${method} ${schema}`);
    }
    isPublic(schema) {
        return this.public || this.publicSchemas.includes(schema);
    }
    alias(method, path, target) {
        if (!this.aliases_[method]) {
            this.aliases_[method] = {};
        }
        this.aliases_[method][path] = target;
    }
    get(path, handler, type = null) {
        if (!this.routes_.GET) {
            this.routes_.GET = {};
        }
        this.routes_.GET[path] = { handler, type };
    }
    post(path, handler, type = null) {
        if (!this.routes_.POST) {
            this.routes_.POST = {};
        }
        this.routes_.POST[path] = { handler, type };
    }
    patch(path, handler, type = null) {
        if (!this.routes_.PATCH) {
            this.routes_.PATCH = {};
        }
        this.routes_.PATCH[path] = { handler, type };
    }
    del(path, handler, type = null) {
        if (!this.routes_.DELETE) {
            this.routes_.DELETE = {};
        }
        this.routes_.DELETE[path] = { handler, type };
    }
    put(path, handler, type = null) {
        if (!this.routes_.PUT) {
            this.routes_.PUT = {};
        }
        this.routes_.PUT[path] = { handler, type };
    }
}
exports.default = Router;
//# sourceMappingURL=Router.js.map