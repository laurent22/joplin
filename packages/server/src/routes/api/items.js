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
exports.putItemContents = void 0;
const requestUtils_1 = require("../../utils/requestUtils");
const routeUtils_1 = require("../../utils/routeUtils");
const Router_1 = require("../../utils/Router");
const types_1 = require("../../utils/types");
const fs = require("fs-extra");
const errors_1 = require("../../utils/errors");
const pagination_1 = require("../../models/utils/pagination");
const BaseModel_1 = require("../../models/BaseModel");
const fileUtils_1 = require("../../utils/fileUtils");
const bytes_1 = require("../../utils/bytes");
const ChangeModel_1 = require("../../models/ChangeModel");
const router = new Router_1.default(types_1.RouteType.Api);
const batchMaxSize = 1 * bytes_1.MB;
function putItemContents(path, ctx, isBatch) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        if (!ctx.joplin.owner.can_upload)
            throw new errors_1.ErrorForbidden('Uploading content is disabled');
        const parsedBody = yield (0, requestUtils_1.formParse)(ctx.req);
        const bodyFields = parsedBody.fields;
        const saveOptions = {};
        let items = [];
        if (isBatch) {
            let totalSize = 0;
            items = bodyFields.items.map((item) => {
                totalSize += item.name.length + (item.body ? item.body.length : 0);
                return {
                    name: item.name,
                    body: item.body ? Buffer.from(item.body, 'utf8') : Buffer.alloc(0),
                };
            });
            if (totalSize > batchMaxSize)
                throw new errors_1.ErrorPayloadTooLarge(`Size of items (${(0, bytes_1.formatBytes)(totalSize)}) is over the limit (${(0, bytes_1.formatBytes)(batchMaxSize)})`);
        }
        else {
            const filePath = ((_a = parsedBody === null || parsedBody === void 0 ? void 0 : parsedBody.files) === null || _a === void 0 ? void 0 : _a.file) ? parsedBody.files.file.filepath : null;
            try {
                const buffer = filePath ? yield fs.readFile(filePath) : Buffer.alloc(0);
                // This end point can optionally set the associated jop_share_id field. It
                // is only useful when uploading resource blob (under .resource folder)
                // since they can't have metadata. Note, Folder and Resource items all
                // include the "share_id" field property so it doesn't need to be set via
                // query parameter.
                if (ctx.query['share_id']) {
                    saveOptions.shareId = ctx.query['share_id'];
                    yield ctx.joplin.models.item().checkIfAllowed(ctx.joplin.owner, BaseModel_1.AclAction.Create, { jop_share_id: saveOptions.shareId });
                }
                items = [
                    {
                        name: ctx.joplin.models.item().pathToName(path.id),
                        body: buffer,
                    },
                ];
            }
            finally {
                if (filePath)
                    yield (0, fileUtils_1.safeRemove)(filePath);
            }
        }
        const output = yield ctx.joplin.models.item().saveFromRawContent(ctx.joplin.owner, items, saveOptions);
        for (const [name] of Object.entries(output)) {
            if (output[name].item)
                output[name].item = ctx.joplin.models.item().toApiOutput(output[name].item);
            if (output[name].error)
                output[name].error = (0, errors_1.errorToPlainObject)(output[name].error);
        }
        return output;
    });
}
exports.putItemContents = putItemContents;
// Note about access control:
//
// - All these calls are scoped to a user, which is derived from the session
// - All items are accessed by userId/itemName
// - In other words, it is not possible for a user to access another user's
//   items, thus the lack of checkIfAllowed() calls as that would not be
//   necessary, and would be slower.
// - For now, users who are shared a folder with have full access to all items
//   within that folder. Except that they cannot delete the root folder if they
//   are not the owner, so there's a check in this case.
function itemFromPath(userId, itemModel, path, mustExists = true) {
    return __awaiter(this, void 0, void 0, function* () {
        const name = itemModel.pathToName(path.id);
        const item = yield itemModel.loadByName(userId, name);
        if (mustExists && !item)
            throw new errors_1.ErrorNotFound(`Not found: ${path.id}`);
        return item;
    });
}
router.get('api/items/:id', (path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const itemModel = ctx.joplin.models.item();
    const item = yield itemFromPath(ctx.joplin.owner.id, itemModel, path);
    return itemModel.toApiOutput(item);
}));
router.del('api/items/:id', (path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (path.id === 'root' || path.id === 'root:/:') {
            // We use this for testing only and for safety reasons it's probably
            // best to disable it on production.
            if (ctx.joplin.env !== 'dev')
                throw new errors_1.ErrorMethodNotAllowed('Deleting the root is not allowed');
            yield ctx.joplin.models.item().deleteAll(ctx.joplin.owner.id);
        }
        else {
            const item = yield itemFromPath(ctx.joplin.owner.id, ctx.joplin.models.item(), path);
            yield ctx.joplin.models.item().checkIfAllowed(ctx.joplin.owner, BaseModel_1.AclAction.Delete, item);
            yield ctx.joplin.models.item().deleteForUser(ctx.joplin.owner.id, item);
        }
    }
    catch (error) {
        if (error instanceof errors_1.ErrorNotFound) {
            // That's ok - a no-op
        }
        else {
            throw error;
        }
    }
}));
router.get('api/items/:id/content', (path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const itemModel = ctx.joplin.models.item();
    const item = yield itemFromPath(ctx.joplin.owner.id, itemModel, path);
    const serializedContent = yield itemModel.serializedContent(item.id);
    return (0, routeUtils_1.respondWithItemContent)(ctx.response, item, serializedContent);
}));
router.put('api/items/:id/content', (path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const results = yield putItemContents(path, ctx, false);
    const result = results[Object.keys(results)[0]];
    if (result.error)
        throw result.error;
    return result.item;
}));
router.get('api/items/:id/delta', (_path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const changeModel = ctx.joplin.models.change();
    return changeModel.delta(ctx.joplin.owner.id, (0, ChangeModel_1.requestDeltaPagination)(ctx.query));
}));
router.get('api/items/:id/children', (path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const itemModel = ctx.joplin.models.item();
    const parentName = itemModel.pathToName(path.id);
    const result = yield itemModel.children(ctx.joplin.owner.id, parentName, (0, pagination_1.requestPagination)(ctx.query));
    return result;
}));
exports.default = router;
//# sourceMappingURL=items.js.map