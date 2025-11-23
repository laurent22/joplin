"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthTokenStatus = exports.RequestMethod = void 0;
const errors_1 = require("./utils/errors");
const folders_1 = require("./routes/folders");
const notes_1 = require("./routes/notes");
const resources_1 = require("./routes/resources");
const tags_1 = require("./routes/tags");
const master_keys_1 = require("./routes/master_keys");
const search_1 = require("./routes/search");
const ping_1 = require("./routes/ping");
const auth_1 = require("./routes/auth");
const events_1 = require("./routes/events");
const revisions_1 = require("./routes/revisions");
const { ltrimSlashes } = require('../../path-utils');
const md5 = require('md5');
var RequestMethod;
(function (RequestMethod) {
    RequestMethod["GET"] = "GET";
    RequestMethod["POST"] = "POST";
    RequestMethod["PUT"] = "PUT";
    RequestMethod["DELETE"] = "DELETE";
})(RequestMethod || (exports.RequestMethod = RequestMethod = {}));
var AuthTokenStatus;
(function (AuthTokenStatus) {
    AuthTokenStatus["Waiting"] = "waiting";
    AuthTokenStatus["Accepted"] = "accepted";
    AuthTokenStatus["Rejected"] = "rejected";
})(AuthTokenStatus || (exports.AuthTokenStatus = AuthTokenStatus = {}));
class Api {
    // eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any -- Old code before rule was applied, Old code before rule was applied
    constructor(token = null, dispatch = null, actionApi = null) {
        this.authToken_ = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        this.knownNounces_ = {};
        this.resourceNameToRoute_ = {};
        this.token_ = token;
        this.actionApi_ = actionApi;
        this.dispatch_ = dispatch;
        this.resourceNameToRoute_ = {
            ping: ping_1.default,
            notes: notes_1.default,
            folders: folders_1.default,
            tags: tags_1.default,
            resources: resources_1.default,
            master_keys: master_keys_1.default,
            search: search_1.default,
            services: this.action_services.bind(this),
            auth: auth_1.default,
            events: events_1.default,
            revisions: revisions_1.default,
        };
        this.dispatch = this.dispatch.bind(this);
    }
    get token() {
        return typeof this.token_ === 'function' ? this.token_() : this.token_;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    dispatch(action) {
        if (action.type === 'API_AUTH_TOKEN_SET') {
            this.authToken_ = {
                value: action.value,
                status: AuthTokenStatus.Waiting,
            };
            this.dispatch_({
                type: 'API_NEED_AUTH_SET',
                value: true,
            });
            return;
        }
        return this.dispatch_(action);
    }
    acceptAuthToken(accept) {
        if (!this.authToken_)
            throw new Error('Auth token is not set');
        this.authToken_.status = accept ? AuthTokenStatus.Accepted : AuthTokenStatus.Rejected;
        this.dispatch_({
            type: 'API_NEED_AUTH_SET',
            value: false,
        });
    }
    parsePath(path) {
        path = ltrimSlashes(path);
        if (!path)
            return { fn: null, params: [] };
        const pathParts = path.split('/');
        const callSuffix = pathParts.splice(0, 1)[0];
        const fn = this.resourceNameToRoute_[callSuffix];
        return {
            fn: fn,
            params: pathParts,
        };
    }
    // Response can be any valid JSON object, so a string, and array or an object (key/value pairs).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async route(method, path, query = null, body = null, files = null) {
        if (!files)
            files = [];
        if (!query)
            query = {};
        const parsedPath = this.parsePath(path);
        if (!parsedPath.fn)
            throw new errors_1.ErrorNotFound(); // Nothing at the root yet
        if (query && query.nounce) {
            const requestMd5 = md5(JSON.stringify([method, path, body, query, files.length]));
            if (this.knownNounces_[query.nounce] === requestMd5) {
                throw new errors_1.ErrorBadRequest('Duplicate Nounce');
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
        const request = {
            method,
            path: ltrimSlashes(path),
            query: query ? query : {},
            body,
            bodyJson_: null,
            bodyJson: function (disallowedProperties = null) {
                if (!this.bodyJson_)
                    this.bodyJson_ = JSON.parse(this.body);
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
        const context = {
            dispatch: this.dispatch,
            token: this.token,
            authToken: this.authToken_,
        };
        try {
            return await parsedPath.fn(request, id, link, context);
        }
        catch (error) {
            if (!error.httpCode)
                error.httpCode = 500;
            throw error;
        }
    }
    checkToken_(request) {
        // For now, whitelist some calls to allow the web clipper to work
        // without an extra auth step
        // const whiteList = [['GET', 'ping'], ['GET', 'tags'], ['GET', 'folders'], ['POST', 'notes']];
        const whiteList = [
            ['GET', 'ping'],
            ['GET', 'auth'],
            ['POST', 'auth'],
            ['GET', 'auth/check'],
        ];
        for (let i = 0; i < whiteList.length; i++) {
            if (whiteList[i][0] === request.method && whiteList[i][1] === request.path)
                return;
        }
        // If the API has been initialized without a token, it means no auth is
        // needed. This is for example when it is used as the plugin data API.
        if (!this.token)
            return;
        if (!request.query || !request.query.token)
            throw new errors_1.ErrorForbidden('Missing "token" parameter');
        if (request.query.token !== this.token)
            throw new errors_1.ErrorForbidden('Invalid "token" parameter');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async execServiceActionFromRequest_(externalApi, request) {
        const action = externalApi[request.action];
        if (!action)
            throw new errors_1.ErrorNotFound(`Invalid action: ${request.action}`);
        const args = Object.assign({}, request);
        delete args.action;
        return action(args);
    }
    async action_services(request, serviceName) {
        if (request.method !== RequestMethod.POST)
            throw new errors_1.ErrorMethodNotAllowed();
        if (!this.actionApi_)
            throw new errors_1.ErrorNotFound('No action API has been setup!');
        if (!this.actionApi_[serviceName])
            throw new errors_1.ErrorNotFound(`No such service: ${serviceName}`);
        const externalApi = this.actionApi_[serviceName]();
        return this.execServiceActionFromRequest_(externalApi, JSON.parse(request.body));
    }
}
exports.default = Api;
