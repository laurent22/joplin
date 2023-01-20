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
const errors_1 = require("../../utils/errors");
const types_1 = require("../../services/database/types");
const requestUtils_1 = require("../../utils/requestUtils");
const Router_1 = require("../../utils/Router");
const types_2 = require("../../utils/types");
const BaseModel_1 = require("../../models/BaseModel");
const router = new Router_1.default(types_2.RouteType.Api);
router.public = true;
router.post('api/shares', (_path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    (0, requestUtils_1.ownerRequired)(ctx);
    const shareModel = ctx.joplin.models.share();
    const fields = yield (0, requestUtils_1.bodyFields)(ctx.req);
    const shareInput = shareModel.fromApiInput(fields);
    if (fields.folder_id)
        shareInput.folder_id = fields.folder_id;
    if (fields.note_id)
        shareInput.note_id = fields.note_id;
    const masterKeyId = fields.master_key_id || '';
    // - The API end point should only expose two ways of sharing:
    //     - By folder_id (JoplinRootFolder)
    //     - By note_id (Link)
    // - Additionally, the App method is available, but not exposed via the API.
    if (shareInput.folder_id) {
        return ctx.joplin.models.share().shareFolder(ctx.joplin.owner, shareInput.folder_id, masterKeyId);
    }
    else if (shareInput.note_id) {
        return ctx.joplin.models.share().shareNote(ctx.joplin.owner, shareInput.note_id, masterKeyId, fields.recursive === 1);
    }
    else {
        throw new errors_1.ErrorBadRequest('Either folder_id or note_id must be provided');
    }
}));
router.post('api/shares/:id/users', (path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    (0, requestUtils_1.ownerRequired)(ctx);
    const fields = yield (0, requestUtils_1.bodyFields)(ctx.req);
    const user = yield ctx.joplin.models.user().loadByEmail(fields.email);
    if (!user)
        throw new errors_1.ErrorNotFound('User not found');
    const masterKey = fields.master_key || '';
    const shareId = path.id;
    yield ctx.joplin.models.shareUser().checkIfAllowed(ctx.joplin.owner, BaseModel_1.AclAction.Create, {
        share_id: shareId,
        user_id: user.id,
        master_key: masterKey,
    });
    return ctx.joplin.models.shareUser().addByEmail(shareId, user.email, masterKey);
}));
router.get('api/shares/:id/users', (path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    (0, requestUtils_1.ownerRequired)(ctx);
    const shareId = path.id;
    const share = yield ctx.joplin.models.share().load(shareId);
    yield ctx.joplin.models.share().checkIfAllowed(ctx.joplin.owner, BaseModel_1.AclAction.Read, share);
    const shareUsers = yield ctx.joplin.models.shareUser().byShareId(shareId, null);
    const users = yield ctx.joplin.models.user().loadByIds(shareUsers.map(su => su.user_id));
    const items = shareUsers.map(su => {
        const user = users.find(u => u.id === su.user_id);
        return {
            id: su.id,
            status: su.status,
            user: {
                id: user.id,
                email: user.email,
            },
        };
    });
    return {
        items,
        has_more: false,
    };
}));
router.get('api/shares/:id', (path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const shareModel = ctx.joplin.models.share();
    const share = yield shareModel.load(path.id);
    if (share && share.type === types_1.ShareType.Note) {
        // No authentication is necessary - anyone who knows the share ID is allowed
        // to access the file. It is essentially public.
        return shareModel.toApiOutput(share);
    }
    throw new errors_1.ErrorNotFound();
}));
// This end points returns both the shares owned by the user, and those they
// participate in.
router.get('api/shares', (_path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    (0, requestUtils_1.ownerRequired)(ctx);
    const ownedShares = ctx.joplin.models.share().toApiOutput(yield ctx.joplin.models.share().sharesByUser(ctx.joplin.owner.id));
    const participatedShares = ctx.joplin.models.share().toApiOutput(yield ctx.joplin.models.share().participatedSharesByUser(ctx.joplin.owner.id));
    // Fake paginated results so that it can be added later on, if needed.
    return {
        items: ownedShares.concat(participatedShares).map(share => {
            return Object.assign(Object.assign({}, share), { user: {
                    id: share.owner_id,
                } });
        }),
        has_more: false,
    };
}));
router.del('api/shares/:id', (path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    (0, requestUtils_1.ownerRequired)(ctx);
    const share = yield ctx.joplin.models.share().load(path.id);
    yield ctx.joplin.models.share().checkIfAllowed(ctx.joplin.owner, BaseModel_1.AclAction.Delete, share);
    yield ctx.joplin.models.share().delete(share.id);
}));
exports.default = router;
//# sourceMappingURL=shares.js.map