"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeUrl = exports.UrlType = exports.respondWithItemContent = exports.findMatchingRoute = exports.execRequest = exports.routeResponseFormat = exports.userIdFromUserContentUrl = exports.isValidOrigin = exports.parseSubPath = exports.urlMatchesSchema = exports.isPathBasedAddressing = exports.removeFilePathPrefix = exports.splitItemPath = exports.filePathInfo = exports.redirect = exports.Response = exports.ResponseType = exports.RouteResponseFormat = void 0;
const config_1 = require("../config");
const types_1 = require("../services/database/types");
const errors_1 = require("./errors");
const types_2 = require("./types");
const url_1 = require("url");
const csrf_1 = require("./csrf");
const requestUtils_1 = require("./requestUtils");
const urlUtils_1 = require("./urlUtils");
const { ltrimSlashes, rtrimSlashes } = require('@joplin/lib/path-utils');
function dirname(path) {
    if (!path)
        throw new Error('Path is empty');
    const s = path.split('/');
    s.pop();
    return s.join('/');
}
function basename(path) {
    if (!path)
        throw new Error('Path is empty');
    const s = path.split('/');
    return s[s.length - 1];
}
var RouteResponseFormat;
(function (RouteResponseFormat) {
    RouteResponseFormat["Html"] = "html";
    RouteResponseFormat["Json"] = "json";
})(RouteResponseFormat = exports.RouteResponseFormat || (exports.RouteResponseFormat = {}));
var ResponseType;
(function (ResponseType) {
    ResponseType[ResponseType["KoaResponse"] = 0] = "KoaResponse";
    ResponseType[ResponseType["Object"] = 1] = "Object";
})(ResponseType = exports.ResponseType || (exports.ResponseType = {}));
class Response {
    constructor(type, response) {
        this.type = type;
        this.response = response;
    }
}
exports.Response = Response;
function removeTrailingColon(path) {
    if (!path || !path.length)
        return '';
    if (path[path.length - 1] === ':')
        return path.substr(0, path.length - 1);
    return path;
}
function redirect(ctx, url) {
    ctx.redirect(url);
    ctx.response.status = 302;
    return new Response(ResponseType.KoaResponse, ctx.response);
}
exports.redirect = redirect;
function filePathInfo(path) {
    return {
        basename: removeTrailingColon(basename(path)),
        dirname: removeTrailingColon(dirname(path)),
    };
}
exports.filePathInfo = filePathInfo;
// root:/Documents/MyFile.md
function splitItemPath(path) {
    if (!path)
        return [];
    const output = path.split('/');
    // Remove trailing ":" from root dir
    if (output.length) {
        output[0] = removeTrailingColon(output[0]);
        output[output.length - 1] = removeTrailingColon(output[output.length - 1]);
    }
    return output;
}
exports.splitItemPath = splitItemPath;
// Converts root:/path/to/file.md to /path/to/file.md
function removeFilePathPrefix(path) {
    if (!path || path.indexOf(':') < 0)
        return path;
    const p = path.split(':');
    return p[1];
}
exports.removeFilePathPrefix = removeFilePathPrefix;
function isPathBasedAddressing(fileId) {
    if (!fileId)
        return false;
    return fileId.indexOf(':') >= 0;
}
exports.isPathBasedAddressing = isPathBasedAddressing;
const urlMatchesSchema = (url, schema) => {
    url = (0, urlUtils_1.stripOffQueryParameters)(url);
    const regex = new RegExp(`${schema.replace(/:id/, '[a-zA-Z0-9]+')}$`);
    return !!url.match(regex);
};
exports.urlMatchesSchema = urlMatchesSchema;
// Allows parsing the two types of paths supported by the API:
//
// root:/Documents/MyFile.md:/content
// ABCDEFG/content
function parseSubPath(basePath, p, rawPath = null) {
    p = rtrimSlashes(ltrimSlashes(p));
    const output = {
        id: '',
        link: '',
        addressingType: types_1.ItemAddressingType.Id,
        raw: rawPath === null ? p : ltrimSlashes(rawPath),
        schema: '',
    };
    const colonIndex1 = p.indexOf(':');
    if (colonIndex1 > 0) {
        output.addressingType = types_1.ItemAddressingType.Path;
        const colonIndex2 = p.indexOf(':', colonIndex1 + 1);
        if (colonIndex2 < 0) {
            throw new errors_1.ErrorBadRequest(`Invalid path format: ${p}`);
        }
        else {
            output.id = decodeURIComponent(p.substr(0, colonIndex2 + 1));
            output.link = ltrimSlashes(p.substr(colonIndex2 + 1));
        }
    }
    else {
        const s = p.split('/');
        if (s.length >= 1)
            output.id = decodeURIComponent(s[0]);
        if (s.length >= 2)
            output.link = s[1];
    }
    if (basePath) {
        const schema = [basePath];
        if (output.id)
            schema.push(':id');
        if (output.link)
            schema.push(output.link);
        output.schema = schema.join('/');
    }
    return output;
}
exports.parseSubPath = parseSubPath;
function isValidOrigin(requestOrigin, endPointBaseUrl, routeType) {
    const host1 = (new url_1.URL(requestOrigin)).host;
    const host2 = (new url_1.URL(endPointBaseUrl)).host;
    if (routeType === types_2.RouteType.UserContent) {
        // At this point we only check if eg usercontent.com has been accessed
        // with origin usercontent.com, or something.usercontent.com. We don't
        // check that the user ID is valid or is event present. This will be
        // done by the /share end point, which will also check that the share
        // owner ID matches the origin URL.
        if (host1 === host2)
            return true;
        const hostNoPrefix = host1.split('.').slice(1).join('.');
        return hostNoPrefix === host2;
    }
    else {
        return host1 === host2;
    }
}
exports.isValidOrigin = isValidOrigin;
function userIdFromUserContentUrl(url) {
    const s = (new url_1.URL(url)).hostname.split('.');
    return s[0].toLowerCase();
}
exports.userIdFromUserContentUrl = userIdFromUserContentUrl;
function routeResponseFormat(context) {
    const path = context.path;
    return path.indexOf('api') === 0 || path.indexOf('/api') === 0 ? RouteResponseFormat.Json : RouteResponseFormat.Html;
}
exports.routeResponseFormat = routeResponseFormat;
function disabledAccountCheck(route, user) {
    if (!user || user.enabled)
        return;
    if (route.subPath.schema.startsWith('api/'))
        throw new errors_1.ErrorForbidden(`This account is disabled. Please login to ${(0, config_1.default)().baseUrl} for more information.`);
}
function execRequest(routes, ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        const match = findMatchingRoute(ctx.path, routes);
        if (!match)
            throw new errors_1.ErrorNotFound();
        const endPoint = match.route.findEndPoint(ctx.request.method, match.subPath.schema);
        if (ctx.URL && !isValidOrigin(ctx.URL.origin, (0, config_1.baseUrl)(endPoint.type), endPoint.type))
            throw new errors_1.ErrorNotFound(`Invalid origin: ${ctx.URL.origin}`, 'invalidOrigin');
        const isPublicRoute = match.route.isPublic(match.subPath.schema);
        // This is a generic catch-all for all private end points - if we
        // couldn't get a valid session, we exit now. Individual end points
        // might have additional permission checks depending on the action.
        if (!isPublicRoute && !ctx.joplin.owner) {
            if ((0, requestUtils_1.contextSessionId)(ctx, false)) {
                // If we have a session but not a user it means the session was
                // invalid or has expired, so display a special message, since this
                // is also going to be displayed on the website.
                throw new errors_1.ErrorForbidden('Your session has expired. Please login again.');
            }
            else {
                throw new errors_1.ErrorForbidden();
            }
        }
        yield (0, csrf_1.csrfCheck)(ctx, isPublicRoute);
        disabledAccountCheck(match, ctx.joplin.owner);
        return {
            response: yield endPoint.handler(match.subPath, ctx),
            path: match.subPath,
        };
    });
}
exports.execRequest = execRequest;
// In a path such as "/api/files/SOME_ID/content" we want to find:
// - The base path: "api/files"
// - The ID: "SOME_ID"
// - The link: "content"
function findMatchingRoute(path, routes) {
    // Enforce that path starts with "/" because if it doesn't, the function
    // will return strange but valid results.
    if (path.length && path[0] !== '/')
        throw new Error(`Expected path to start with "/": ${path}`);
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
exports.findMatchingRoute = findMatchingRoute;
function respondWithItemContent(koaResponse, item, content) {
    koaResponse.body = item.jop_type > 0 ? content.toString() : content;
    koaResponse.set('Content-Type', item.mime_type);
    koaResponse.set('Content-Length', content.byteLength);
    return new Response(ResponseType.KoaResponse, koaResponse);
}
exports.respondWithItemContent = respondWithItemContent;
var UrlType;
(function (UrlType) {
    UrlType["Signup"] = "signup";
    UrlType["Login"] = "login";
    UrlType["Terms"] = "terms";
    UrlType["Privacy"] = "privacy";
    UrlType["Tasks"] = "admin/tasks";
    UrlType["UserDeletions"] = "admin/user_deletions";
})(UrlType = exports.UrlType || (exports.UrlType = {}));
function makeUrl(urlType) {
    if ((0, config_1.default)().isJoplinCloud && urlType === UrlType.Signup) {
        return `${(0, config_1.default)().joplinAppBaseUrl}/plans`;
    }
    else {
        return `${(0, config_1.baseUrl)(types_2.RouteType.Web)}/${urlType}`;
    }
}
exports.makeUrl = makeUrl;
//# sourceMappingURL=routeUtils.js.map