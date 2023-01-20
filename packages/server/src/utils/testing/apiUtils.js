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
exports.execApi = exports.execApiC = exports.execRequest = exports.execRequestC = exports.postApi = exports.postApiC = exports.deleteApi = exports.deleteApiC = exports.getApi = exports.getApiC = exports.patchApi = exports.patchApiC = exports.putApi = exports.putApiC = void 0;
const routeHandler_1 = require("../../middleware/routeHandler");
const testUtils_1 = require("./testUtils");
function putApiC(sessionId, path, body = null, options = null) {
    return __awaiter(this, void 0, void 0, function* () {
        return execApiC(sessionId, 'PUT', path, body, options);
    });
}
exports.putApiC = putApiC;
function putApi(sessionId, path, body = null, options = null) {
    return __awaiter(this, void 0, void 0, function* () {
        return execApi(sessionId, 'PUT', path, body, options);
    });
}
exports.putApi = putApi;
function patchApiC(sessionId, path, body = null, options = null) {
    return __awaiter(this, void 0, void 0, function* () {
        return execApiC(sessionId, 'PATCH', path, body, options);
    });
}
exports.patchApiC = patchApiC;
function patchApi(sessionId, path, body = null, options = null) {
    return __awaiter(this, void 0, void 0, function* () {
        return execApi(sessionId, 'PATCH', path, body, options);
    });
}
exports.patchApi = patchApi;
function getApiC(sessionId, path, options = null) {
    return __awaiter(this, void 0, void 0, function* () {
        return execApiC(sessionId, 'GET', path, null, options);
    });
}
exports.getApiC = getApiC;
function getApi(sessionId, path, options = null) {
    return __awaiter(this, void 0, void 0, function* () {
        return execApi(sessionId, 'GET', path, null, options);
    });
}
exports.getApi = getApi;
function deleteApiC(sessionId, path, options = null) {
    return __awaiter(this, void 0, void 0, function* () {
        return execApiC(sessionId, 'DELETE', path, null, options);
    });
}
exports.deleteApiC = deleteApiC;
function deleteApi(sessionId, path, options = null) {
    return __awaiter(this, void 0, void 0, function* () {
        return execApi(sessionId, 'DELETE', path, null, options);
    });
}
exports.deleteApi = deleteApi;
function postApiC(sessionId, path, body = null, options = null) {
    return __awaiter(this, void 0, void 0, function* () {
        return execApiC(sessionId, 'POST', path, body, options);
    });
}
exports.postApiC = postApiC;
function postApi(sessionId, path, body = null, options = null) {
    return __awaiter(this, void 0, void 0, function* () {
        return execApi(sessionId, 'POST', path, body, options);
    });
}
exports.postApi = postApi;
function execRequestC(sessionId, method, path, body = null, options = null) {
    return __awaiter(this, void 0, void 0, function* () {
        options = options || {};
        const appContextOptions = {
            sessionId,
            request: {
                method,
                url: `/${path}`,
            },
        };
        if (body)
            appContextOptions.request.body = body;
        if (options.filePath)
            appContextOptions.request.files = { file: { filepath: options.filePath } };
        if (options.query)
            appContextOptions.request.query = options.query;
        const context = yield (0, testUtils_1.koaAppContext)(appContextOptions);
        yield (0, routeHandler_1.default)(context);
        return context;
    });
}
exports.execRequestC = execRequestC;
function execRequest(sessionId, method, url, body = null, options = null) {
    return __awaiter(this, void 0, void 0, function* () {
        const context = yield execRequestC(sessionId, method, url, body, options);
        yield (0, testUtils_1.checkContextError)(context);
        return context.response.body;
    });
}
exports.execRequest = execRequest;
function execApiC(sessionId, method, path, body = null, options = null) {
    return __awaiter(this, void 0, void 0, function* () {
        return execRequestC(sessionId, method, `api/${path}`, body, options);
    });
}
exports.execApiC = execApiC;
function execApi(sessionId, method, url, body = null, options = null) {
    return __awaiter(this, void 0, void 0, function* () {
        const context = yield execApiC(sessionId, method, url, body, options);
        yield (0, testUtils_1.checkContextError)(context);
        return context.response.body;
    });
}
exports.execApi = execApi;
//# sourceMappingURL=apiUtils.js.map