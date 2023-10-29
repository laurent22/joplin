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
const requestUtils_1 = require("../../utils/requestUtils");
const Router_1 = require("../../utils/Router");
const types_1 = require("../../utils/types");
const BaseModel_1 = require("../../models/BaseModel");
const router = new Router_1.default(types_1.RouteType.Api);
router.patch('api/share_users/:id', (path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const shareUserModel = ctx.joplin.models.shareUser();
    const shareUser = yield shareUserModel.load(path.id);
    if (!shareUser)
        throw new errors_1.ErrorNotFound();
    yield shareUserModel.checkIfAllowed(ctx.joplin.owner, BaseModel_1.AclAction.Update, shareUser);
    const body = yield (0, requestUtils_1.bodyFields)(ctx.req);
    if ('status' in body) {
        return shareUserModel.setStatus(shareUser.share_id, shareUser.user_id, body.status);
    }
    else {
        throw new errors_1.ErrorBadRequest('Only setting status is supported');
    }
}));
router.del('api/share_users/:id', (path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const shareUser = yield ctx.joplin.models.shareUser().load(path.id);
    if (!shareUser)
        throw new errors_1.ErrorNotFound();
    yield ctx.joplin.models.shareUser().checkIfAllowed(ctx.joplin.owner, BaseModel_1.AclAction.Delete, shareUser);
    yield ctx.joplin.models.shareUser().delete(shareUser.id);
}));
router.get('api/share_users', (_path, ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const shareUsers = yield ctx.joplin.models.shareUser().byUserId(ctx.joplin.owner.id);
    const items = [];
    for (const su of shareUsers) {
        const share = yield ctx.joplin.models.share().load(su.share_id);
        const sharer = yield ctx.joplin.models.user().load(share.owner_id);
        items.push({
            id: su.id,
            status: su.status,
            master_key: su.master_key,
            share: {
                id: share.id,
                folder_id: share.folder_id,
                user: {
                    full_name: sharer.full_name,
                    email: sharer.email,
                },
            },
        });
    }
    return {
        items: items,
        has_more: false,
    };
}));
exports.default = router;
//# sourceMappingURL=share_users.js.map