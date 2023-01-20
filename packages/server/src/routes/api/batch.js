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
const requestUtils_1 = require("../../utils/requestUtils");
const Router_1 = require("../../utils/Router");
const types_1 = require("../../utils/types");
const routeHandler_1 = require("../../middleware/routeHandler");
const config_1 = require("../../config");
const errors_1 = require("../../utils/errors");
const router = new Router_1.default(types_1.RouteType.Api);
const maxSubRequests = 50;
function createSubRequestContext(ctx, subRequest) {
    const fullUrl = `${(0, config_1.default)().apiBaseUrl}/${subRequest.url.trim()}`;
    const newContext = Object.assign(Object.assign({}, ctx), { URL: new URL(fullUrl), request: Object.assign(Object.assign({}, ctx.request), { method: subRequest.method }), method: subRequest.method, headers: Object.assign(Object.assign({}, ctx.headers), subRequest.headers), body: subRequest.body, joplin: Object.assign(Object.assign({}, ctx.joplin), { appLogger: ctx.joplin.appLogger, services: ctx.joplin.services, db: ctx.joplin.db, models: ctx.joplin.models, routes: ctx.joplin.routes }), path: `/${subRequest.url}`, url: fullUrl });
    return newContext;
}
function validateRequest(request) {
    const output = Object.assign({}, request);
    if (!output.method)
        output.method = types_1.HttpMethod.GET;
    if (!output.url)
        throw new Error('"url" is required');
    return output;
}
router.post('api/batch', (_path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    throw new Error('Not enabled');
    // eslint-disable-next-line no-unreachable
    const subRequests = yield (0, requestUtils_1.bodyFields)(ctx.req);
    if (Object.keys(subRequests).length > maxSubRequests)
        throw new errors_1.ErrorBadRequest(`Can only process up to ${maxSubRequests} requests`);
    const response = {};
    for (const subRequestId of Object.keys(subRequests)) {
        const subRequest = validateRequest(subRequests[subRequestId]);
        const subRequestContext = createSubRequestContext(ctx, subRequest);
        yield (0, routeHandler_1.default)(subRequestContext);
        const r = subRequestContext.response;
        response[subRequestId] = {
            status: r.status,
            body: typeof r.body === 'object' ? Object.assign({}, r.body) : r.body,
            header: r.header ? Object.assign({}, r.header) : {},
        };
    }
    return response;
}));
exports.default = router;
//# sourceMappingURL=batch.js.map