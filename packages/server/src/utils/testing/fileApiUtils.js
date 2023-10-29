"use strict";
// These utility functions allow making API calls easily from test units.
// There's two versions of each function:
//
// - A regular one, eg. "postDirectory", which returns whatever would have
//   normally return the API call. It also checks for error.
//
// - The other function is suffixed with "Context", eg "postDirectoryContext".
//   In that case, it returns the complete Koa context, which can be used in
//   particular to access the response object and test for errors.
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
exports.getDelta = exports.getDeltaContext = exports.patchFile = exports.patchFileContext = exports.getFileContent = exports.getFileContentContext = exports.putFileContent = exports.putFileContentContext = exports.postDirectory = exports.postDirectoryContext = exports.deleteFile = exports.deleteFileContext = exports.deleteFileContent = exports.deleteFileContentContext = exports.getFileMetadata = exports.getFileMetadataContext = exports.testImageBuffer = exports.testFilePath = void 0;
const routeHandler_1 = require("../../middleware/routeHandler");
const pagination_1 = require("../../models/utils/pagination");
const testUtils_1 = require("./testUtils");
const fs = require("fs-extra");
function testFilePath(ext = 'jpg') {
    const basename = ext === 'jpg' ? 'photo' : 'poster';
    return `${testUtils_1.testAssetDir}/${basename}.${ext}`;
}
exports.testFilePath = testFilePath;
function testImageBuffer() {
    return __awaiter(this, void 0, void 0, function* () {
        const path = testFilePath('jpg');
        return fs.readFile(path);
    });
}
exports.testImageBuffer = testImageBuffer;
function getFileMetadataContext(sessionId, path) {
    return __awaiter(this, void 0, void 0, function* () {
        const context = yield (0, testUtils_1.koaAppContext)({
            sessionId: sessionId,
            request: {
                method: 'GET',
                url: `/api/files/${path}`,
            },
        });
        yield (0, routeHandler_1.default)(context);
        return context;
    });
}
exports.getFileMetadataContext = getFileMetadataContext;
function getFileMetadata(sessionId, path) {
    return __awaiter(this, void 0, void 0, function* () {
        const context = yield getFileMetadataContext(sessionId, path);
        (0, testUtils_1.checkContextError)(context);
        return context.response.body;
    });
}
exports.getFileMetadata = getFileMetadata;
function deleteFileContentContext(sessionId, path) {
    return __awaiter(this, void 0, void 0, function* () {
        const context = yield (0, testUtils_1.koaAppContext)({
            sessionId: sessionId,
            request: {
                method: 'DELETE',
                url: `/api/files/${path}/content`,
            },
        });
        yield (0, routeHandler_1.default)(context);
        return context;
    });
}
exports.deleteFileContentContext = deleteFileContentContext;
function deleteFileContent(sessionId, path) {
    return __awaiter(this, void 0, void 0, function* () {
        const context = yield deleteFileContentContext(sessionId, path);
        (0, testUtils_1.checkContextError)(context);
    });
}
exports.deleteFileContent = deleteFileContent;
function deleteFileContext(sessionId, path) {
    return __awaiter(this, void 0, void 0, function* () {
        const context = yield (0, testUtils_1.koaAppContext)({
            sessionId: sessionId,
            request: {
                method: 'DELETE',
                url: `/api/files/${path}`,
            },
        });
        yield (0, routeHandler_1.default)(context);
        return context;
    });
}
exports.deleteFileContext = deleteFileContext;
function deleteFile(sessionId, path) {
    return __awaiter(this, void 0, void 0, function* () {
        const context = yield deleteFileContext(sessionId, path);
        (0, testUtils_1.checkContextError)(context);
    });
}
exports.deleteFile = deleteFile;
function postDirectoryContext(sessionId, parentPath, name) {
    return __awaiter(this, void 0, void 0, function* () {
        const context = yield (0, testUtils_1.koaAppContext)({
            sessionId: sessionId,
            request: {
                method: 'POST',
                url: `/api/files/${parentPath}/children`,
                body: {
                    is_directory: 1,
                    name: name,
                },
            },
        });
        yield (0, routeHandler_1.default)(context);
        return context;
    });
}
exports.postDirectoryContext = postDirectoryContext;
function postDirectory(sessionId, parentPath, name) {
    return __awaiter(this, void 0, void 0, function* () {
        const context = yield postDirectoryContext(sessionId, parentPath, name);
        (0, testUtils_1.checkContextError)(context);
        return context.response.body;
    });
}
exports.postDirectory = postDirectory;
// export async function getDirectoryChildrenContext(sessionId: string, path: string, pagination: Pagination = null): Promise<AppContext> {
// 	const context = await koaAppContext({
// 		sessionId: sessionId,
// 		request: {
// 			method: 'GET',
// 			url: `/api/files/${path}/children`,
// 			query: paginationToQueryParams(pagination),
// 		},
// 	});
// 	await routeHandler(context);
// 	return context;
// }
// export async function getDirectoryChildren(sessionId: string, path: string, pagination: Pagination = null): Promise<PaginatedResults<any>> {
// 	const context = await getDirectoryChildrenContext(sessionId, path, pagination);
// 	checkContextError(context);
// 	return context.response.body as PaginatedResults;
// }
function putFileContentContext(sessionId, path, filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        const context = yield (0, testUtils_1.koaAppContext)({
            sessionId: sessionId,
            request: {
                method: 'PUT',
                url: `/api/files/${path}/content`,
                files: { file: { path: filePath } },
            },
        });
        yield (0, routeHandler_1.default)(context);
        return context;
    });
}
exports.putFileContentContext = putFileContentContext;
function putFileContent(sessionId, path, filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        const context = yield putFileContentContext(sessionId, path, filePath);
        (0, testUtils_1.checkContextError)(context);
        return context.response.body;
    });
}
exports.putFileContent = putFileContent;
function getFileContentContext(sessionId, path) {
    return __awaiter(this, void 0, void 0, function* () {
        const context = yield (0, testUtils_1.koaAppContext)({
            sessionId: sessionId,
            request: {
                method: 'GET',
                url: `/api/files/${path}/content`,
            },
        });
        yield (0, routeHandler_1.default)(context);
        return context;
    });
}
exports.getFileContentContext = getFileContentContext;
function getFileContent(sessionId, path) {
    return __awaiter(this, void 0, void 0, function* () {
        const context = yield getFileContentContext(sessionId, path);
        (0, testUtils_1.checkContextError)(context);
        return context.response.body;
    });
}
exports.getFileContent = getFileContent;
function patchFileContext(sessionId, path, file) {
    return __awaiter(this, void 0, void 0, function* () {
        const context = yield (0, testUtils_1.koaAppContext)({
            sessionId: sessionId,
            request: {
                method: 'PATCH',
                url: `/api/files/${path}`,
                body: file,
            },
        });
        yield (0, routeHandler_1.default)(context);
        return context;
    });
}
exports.patchFileContext = patchFileContext;
function patchFile(sessionId, path, file) {
    return __awaiter(this, void 0, void 0, function* () {
        const context = yield patchFileContext(sessionId, path, file);
        (0, testUtils_1.checkContextError)(context);
        return context.response.body;
    });
}
exports.patchFile = patchFile;
function getDeltaContext(sessionId, path, pagination) {
    return __awaiter(this, void 0, void 0, function* () {
        const context = yield (0, testUtils_1.koaAppContext)({
            sessionId: sessionId,
            request: {
                method: 'GET',
                url: `/api/files/${path}/delta`,
                query: (0, pagination_1.paginationToQueryParams)(pagination),
            },
        });
        yield (0, routeHandler_1.default)(context);
        return context;
    });
}
exports.getDeltaContext = getDeltaContext;
function getDelta(sessionId, path, pagination) {
    return __awaiter(this, void 0, void 0, function* () {
        const context = yield getDeltaContext(sessionId, path, pagination);
        (0, testUtils_1.checkContextError)(context);
        return context.response.body;
    });
}
exports.getDelta = getDelta;
//# sourceMappingURL=fileApiUtils.js.map