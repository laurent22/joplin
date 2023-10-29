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
const routeUtils_1 = require("../utils/routeUtils");
const types_1 = require("../utils/types");
const MustacheService_1 = require("../services/MustacheService");
const config_1 = require("../config");
const requestUtils_1 = require("../utils/requestUtils");
const csrf_1 = require("../utils/csrf");
const impersonate_1 = require("../routes/admin/utils/users/impersonate");
function default_1(ctx) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        const requestStartTime = Date.now();
        try {
            const { response: responseObject, path } = yield (0, routeUtils_1.execRequest)(ctx.joplin.routes, ctx);
            if (responseObject instanceof routeUtils_1.Response) {
                ctx.response = responseObject.response;
            }
            else if ((0, MustacheService_1.isView)(responseObject)) {
                const impersonatorAdminSessionId = (0, impersonate_1.getImpersonatorAdminSessionId)(ctx);
                const view = responseObject;
                ctx.response.status = ((_a = view === null || view === void 0 ? void 0 : view.content) === null || _a === void 0 ? void 0 : _a.error) ? ((_c = (_b = view === null || view === void 0 ? void 0 : view.content) === null || _b === void 0 ? void 0 : _b.error) === null || _c === void 0 ? void 0 : _c.httpCode) || 500 : 200;
                ctx.response.body = yield ctx.joplin.services.mustache.renderView(view, {
                    currentPath: path,
                    notifications: ctx.joplin.notifications || [],
                    hasNotifications: !!ctx.joplin.notifications && !!ctx.joplin.notifications.length,
                    owner: ctx.joplin.owner,
                    supportEmail: (0, config_1.default)().supportEmail,
                    impersonatorAdminSessionId,
                    csrfTag: impersonatorAdminSessionId ? yield (0, csrf_1.createCsrfTag)(ctx, false) : null,
                });
            }
            else {
                ctx.response.status = 200;
                ctx.response.body = [undefined, null].includes(responseObject) ? '' : responseObject;
            }
        }
        catch (error) {
            if (error.httpCode >= 400 && error.httpCode < 500) {
                const owner = ctx.joplin.owner;
                const line = [
                    error.httpCode,
                    `${ctx.request.method} ${ctx.path}`,
                    owner ? owner.id : (0, requestUtils_1.userIp)(ctx),
                    error.message,
                ];
                if (error.details)
                    line.push(JSON.stringify(error.details));
                ctx.joplin.appLogger().error(line.join(': '));
            }
            else {
                ctx.joplin.appLogger().error((0, requestUtils_1.userIp)(ctx), error);
            }
            // Uncomment this when getting HTML blobs as errors while running tests.
            // console.error(error);
            ctx.response.status = error.httpCode ? error.httpCode : 500;
            const responseFormat = (0, routeUtils_1.routeResponseFormat)(ctx);
            if (error.retryAfterMs)
                ctx.response.set('Retry-After', Math.ceil(error.retryAfterMs / 1000).toString());
            if (error.code === 'invalidOrigin') {
                ctx.response.body = error.message;
            }
            else if (responseFormat === routeUtils_1.RouteResponseFormat.Html) {
                ctx.response.set('Content-Type', 'text/html');
                const view = {
                    name: 'error',
                    path: 'index/error',
                    content: {
                        error,
                        stack: (0, config_1.default)().showErrorStackTraces ? error.stack : '',
                        owner: ctx.joplin.owner,
                    },
                    title: 'Error',
                };
                ctx.response.body = yield ctx.joplin.services.mustache.renderView(view);
            }
            else { // JSON
                ctx.response.set('Content-Type', 'application/json');
                const r = { error: error.message };
                if (ctx.joplin.env === types_1.Env.Dev && error.stack)
                    r.stack = error.stack;
                if (error.code)
                    r.code = error.code;
                ctx.response.body = r;
            }
        }
        finally {
            // Technically this is not the total request duration because there are
            // other middlewares but that should give a good approximation
            const requestDuration = Date.now() - requestStartTime;
            ctx.joplin.appLogger().info(`${ctx.request.method} ${ctx.path} (${ctx.response.status}) (${requestDuration}ms)`);
        }
    });
}
exports.default = default_1;
//# sourceMappingURL=routeHandler.js.map